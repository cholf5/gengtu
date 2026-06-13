# Review — 编辑现有模板（导入 / 导出 JSON）

> 2026-06-13 · 对应设计稿：`2026-06-13-edit-existing-template-design.md`

## 范围

工作树未提交改动，对应实施清单：

- 抽取 `isMemeTemplate` → `src/utils/memeTemplate.ts`
- 新增 `src/utils/templateImport.ts` 与单测
- 改造 `TemplateConfigurator.tsx` 支持导入 JSON
- 跑通 `npm run test` + `npm run build`

涉及文件：

- `src/components/TemplateConfigurator.tsx`（修改）
- `src/memes/index.ts`（修改）
- `src/utils/memeTemplate.ts`（新增）
- `src/utils/templateImport.ts`（新增）
- `src/utils/templateImport.test.ts`（新增）

## 统计

- 已审查文件：5
- 发现问题：1
  - P0：0
  - P1：0
  - P2：1（已修复）
- 待复查：0

## 问题清单

### P2-1 · BASE_URL 拼接重复（低复用性）

**位置：** `src/memes/index.ts` 私有 `resolveTemplateUrl` 与 `src/utils/templateImport.ts:resolveTemplateImageUrl`

**问题：** 两处实现了完全一致的 `url.startsWith('/') ? base+url.slice(1) : url` 逻辑。
新增 `resolveTemplateImageUrl` 把 `baseUrl` 提成参数是为了让单测不依赖 Vite env，但同样的字符串处理出现两份会随时间漂。

**修复：** 删除 `src/memes/index.ts` 中的私有 `resolveTemplateUrl`，统一调用
`resolveTemplateImageUrl(entry.url, import.meta.env.BASE_URL)`。

**状态：** ✅ 已修复，`npm run test` 59/59、`npm run build` 通过。

## 已确认非问题

- **blob URL 生命周期**：所有改 `imageUrl` 的路径都走 `setPreviewImage` + `blobUrlRef`，
  unmount cleanup 一致；用 ref 避免了 `useEffect([imageUrl])` 模式在 React 18
  StrictMode 下双跑导致的早期回收。
- **`handleImageLoad` 时序**：直接读 `imageRef.current.naturalWidth/Height`，
  绕开 `useImagePreviewScale` 的默认 `{900, 600}` —— pendingThumbnail 反归一化
  一定用真实自然像素。
- **同时拖两个 JSON 的竞态**：理论存在（前一个 fetch 还没回，后一个 setState 已经覆盖了
  draft / fields），但项目定位是单 curator 自用，且即使触发也只是 UI 临时不一致、
  不会损坏数据，YAGNI。
- **`tags.join(', ')` 不可逆**：原 `parseTags` 早就用 `,` 切分，tag 内含逗号不被支持，
  导入侧不引入新风险。
- **`isMemeTemplate` 不校验 tags 元素类型**：和 manifest loader 的现有行为一致，
  本次未引入退化。

## 验证

- `npm run test` → 5 files, 59 tests passed
- `npm run build` → 通过（chunk size 警告与本次改动无关）
