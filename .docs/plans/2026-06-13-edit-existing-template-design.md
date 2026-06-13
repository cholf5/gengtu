# 编辑现有模板（导入 / 导出 JSON）

> 2026-06-13

## 背景与目标

`TemplateConfigurator` 当前只能从零创建一个模板：上传图片 → 配置文本框 → 复制 / 下载 JSON。
若作者想修改既有模板（例如调一下文本框位置、加个 tag、换个 thumbnail 裁剪），目前没有任何路径，必须手动改文件 / 重写 JSON。

**目标：** 在不暴露公网编辑入口的前提下，让作者可以"导入现有 JSON → 修改 → 重新下载"。

**显式排除（YAGNI）：**

- 不在 Gallery 卡片上加编辑图标 —— 仓库一旦部署后，谁都能点；保持站点纯展示 + 生成。
- 不在 `MemeEditor` 里加"编辑模板"按钮，理由同上。
- 不引入 `/edit` 路由 / pushState；导入态只活在 `TemplateConfigurator` 的 React state 里，刷新即丢。
- 不持久化到 localStorage。
- 不做 Diff / Merge 提示 —— "Generated JSON" 卡片本身就是实时预览。

## 入口与交互模型

继续从 header 的 **Create template** 按钮进入 `TemplateConfigurator`。改动集中在初始 Dragger：

- `accept` 从 `image/*` 扩展到 `image/*,application/json`。
- 文案改为「Click or drag image **or template JSON**」。
- `beforeUpload` 按文件类型分流：
  - `application/json` 或后缀 `.json` → **import** 路径（见下文）。
  - 其他 → 现有 **new** 路径，行为完全不动。
- 进入编辑态后的「Replace image」按钮**只接受图片**（`accept` 仍为 `image/*`）。这条不对称是为了避免用户编辑半截时不慎拖入 JSON 把进度清空。
- 标题保持 **Create template**；导入成功后副标题改为 `Editing existing template: <derived.id>.json`，提示用户当前在修改既有模板。

## Import 流程拆解

新建 `src/utils/templateImport.ts`，导出两个纯函数（便于单测）：

```ts
parseTemplateJson(text: string): MemeTemplate                    // throw on invalid
buildImportedDraft(template: MemeTemplate): {
  draft: { name: string; tagsInput: string; imageExt: string };
  fields: EditableTextField[];
  pendingThumbnail: MemeThumbnailCrop | null;
}
```

- `parseTemplateJson` 复用 `isMemeTemplate`。把它从 `src/memes/index.ts` 提到 `src/utils/memeTemplate.ts`，让 import 流程和 manifest loader 共享同一份校验，避免漂移。
- 校验失败 → 抛 `Error('JSON 不是合法的模板：…')`，组件层 `catch` 后 `api.error(err.message)`。
- `buildImportedDraft`：
  - `name` ← `template.name`
  - `tagsInput` ← `template.tags.join(', ')`
  - `imageExt` ← `extractFileExtension(template.url)`（已存在）
  - `fields` ← `createEditableFields(template.textFields)`（已存在；fields 是自然像素，无需等 imageSize）
  - `pendingThumbnail` ← `template.thumbnail ?? null`（normalized 0..1，等 imageSize 后再反归一化）

## 图片自动加载

JSON 里 `url` 形如 `/memes/foo.jpg`。导入时按 `src/memes/index.ts:resolveTemplateUrl` 同样规则拼 `BASE_URL`：

```ts
const resolved = url.startsWith('/') ? `${BASE_URL}${url.slice(1)}` : url;
const res = await fetch(resolved);
if (!res.ok) throw new Error(`无法加载图片：${resolved}`);
const blob = await res.blob();
const objectUrl = URL.createObjectURL(blob);
```

走 blob 而不是直接把 `resolved` 塞进 `<img src>`：

- 后续若 Replace image，统一的 `URL.revokeObjectURL` 清理逻辑可以一视同仁。
- fetch 失败时立刻给出 `api.error(...)` 提示，而不是卡在空 img 占位。

**Fallback：** fetch 失败时保留 fields / draft / pendingThumbnail，但 `imageUrl` 留空，回到 Dragger 视图，并在 Dragger 上方加一条 `Alert: 找不到 <url>，请手动上传图片继续编辑`。用户上传后图片就位，pendingThumbnail effect 自动恢复 crop。

## thumbnail 还原

`pendingThumbnail` 是 normalized 0..1，要变成 natural-pixel `Rect` 才能塞进 `cropRect`。

- 在 `src/utils/geometry.ts` 紧邻 `cropToNormalized` 新增 `normalizedToCrop(thumb, imageSize): Rect` —— 逆运算，乘 `imageSize.width/height` 后 `Math.round`。配套 `geometry.test.ts` 验证：
  - 与 `cropToNormalized` 互逆。
  - 在 ≥ 1×1 像素图上四角误差 ≤ 1 px。
- `TemplateConfigurator` 新增 `useEffect([imageSize, pendingThumbnail])`：当 `imageSize.width > 0` 且 `pendingThumbnail` 存在 → `setCropRect(normalizedToCrop(...))` + `setCropEnabled(true)`，然后清空 `pendingThumbnail`。

fields 不依赖 imageSize —— 它们已是自然像素，导入时直接 `setFields(...)`，用户拖动时 `clampBoxToImage` 再次约束。

## Name 派生策略（不变）

按既定取舍：`Template ID` / `Image URL` 仍由 Name 派生。

- 多数情况下导入再导出，`id/url` 就是原值。
- 仅当原 JSON 的 id 不严格遵循「Name → id」规则（罕见）时 derived 值会改写，与现有 New 流程一致，不引入额外开关。

下载文件名仍是 `<derived.id.toLowerCase()>.json`；覆盖原文件正是作者预期的"编辑"效果。

## 状态字段增量

`TemplateConfigurator` 内新增 state：

- `pendingThumbnail: MemeThumbnailCrop | null` —— 等 imageSize 后还原 cropRect。
- `importedHint: string | null` —— 副标题展示用。

进入 import 路径时一次性 `setDraft / setFields / setSelectedFieldId / setCropEnabled / setCropRect / setPendingThumbnail / setImageUrl` —— 顺序与现有 image-upload 路径对齐。

## 错误处理

- JSON 解析失败 / `isMemeTemplate` 失败：toast 错误，**不**进入 import 路径，配置器保持当前状态（不破坏已有进度）。
- 图片 fetch 失败：toast + Alert，仍进入 import 路径但 `imageUrl=''`，让用户手动补图。
- 用户在已编辑态再拖入 JSON：理论上 Replace image 不接受 .json；初始 Dragger 接受 → 直接覆盖当前 state。这条接受："已经在编辑了为啥还要拖另一个 JSON"是用户主动行为，按预期覆盖即可。

## 测试

- `src/utils/templateImport.test.ts`：
  - parseTemplateJson 接受合法 JSON；非对象 / 缺字段 / textFields 元素错误均抛错。
  - buildImportedDraft 把 tags 还原成 `"a, b"`、imageExt 抠对、fields 数量与 id 与输入一致、`pendingThumbnail` 在原 JSON 缺 thumbnail 时为 `null`。
- `src/utils/geometry.test.ts`：
  - 补 `normalizedToCrop` 与 `cropToNormalized` 互逆、舍入误差 ≤ 1 px。

不写 React 组件 / e2e 测试 —— 项目惯例 vitest 只覆盖纯 utils。

## 实施清单

1. 把 `isMemeTemplate` 从 `src/memes/index.ts` 抽到 `src/utils/memeTemplate.ts`，原文件改 import；保持运行时行为不变。
2. 在 `src/utils/geometry.ts` 加 `normalizedToCrop`，配套 test。
3. 新增 `src/utils/templateImport.ts`（`parseTemplateJson` + `buildImportedDraft`），配套 test。
4. 修改 `TemplateConfigurator.tsx`：
   - Dragger `accept` / 文案改造。
   - `beforeUpload` 分流（image vs json）。
   - 新增 `pendingThumbnail` / `importedHint` state 与对应 effect。
   - import 失败 fallback Alert。
   - 副标题展示 `importedHint`。
5. 跑 `npm run test` + `npm run build`。

## 不动的代码

- `MemeEditor.tsx`、`Gallery.tsx`、`App.tsx`、所有 manifest / 路由相关文件。
- `vite-plugin-meme-manifest.ts`。
- 现有 `createEditableFields` / `cropToNormalized` 等 utils 的对外签名。
