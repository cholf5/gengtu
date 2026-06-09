# Open Meme 交接摘要

## 1. 当前任务目标

当前项目目标是实现一个开源、纯前端、可静态部署的 Meme 生成器。核心产品要求来自 `.docs/PRD.md`：无后端、无数据库、无 API Key，模板配置来自 `src/memes/*.json`，图片资源放在 `public/memes/`，用户可选择模板、编辑文本并下载或复制生成图片。

截至本交接时，MVP 与一轮较大的编辑器增强已经完成并提交。当前代码应支持：模板 Gallery、搜索、进入编辑器、可拖拽/缩放/新增/删除文本框、Selected Text Inspector、Font Color / Outline Color、Outline/Shadow/None、Bold/Italic/ALL CAPS、Outline Width、Max Font Size、水平/垂直对齐、Opacity、Bring to top layer、Apply to all、Canvas 下载、Clipboard 复制，以及未导出编辑的 beforeunload 提醒。

完成标准目前是：`npm run build` 和 `npm run build:pages` 通过；编辑器运行无 `process is not defined`；Inspector 使用站点一致的浅色风格和 CSS token，而不是之前暗色 DSL 风格。

## 2. 当前进展

已完成并提交的关键节点：

1. 初始 MVP 提交：`7c0c187 Build initial Open Meme MVP`
   - 搭建 Vite + React + TypeScript + 普通 CSS 工程。
   - 添加 3 个占位模板 SVG：`public/memes/two-buttons.svg`、`top-bottom.svg`、`choice-road.svg`。
   - 添加模板 JSON：`src/memes/*.json`。
   - 使用 `import.meta.glob` 加载模板。
   - 实现 Gallery、Editor、Canvas 下载、剪切板复制。
   - 修复 GitHub Pages 子路径资源问题：`src/memes/index.ts` 会基于 `import.meta.env.BASE_URL` 归一化模板 URL；`package.json` 增加 `build:pages`。

2. 预览缩放修复提交：`b119893 Fix editor preview scaling`
   - 修复图片预览过大导致横向滚动条的问题。
   - `src/components/MemeEditor.tsx` 使用 `ResizeObserver` 计算 `previewScale`。
   - DOM 预览坐标/尺寸/字号按 `previewScale` 缩放，Canvas 导出仍用原始尺寸。

3. Editable Text Inspector 提交：`8400ed5 Add editable text inspector`
   - 引入 `react-rnd`，实现文本框拖拽和缩放。
   - 新增 `src/utils/textStyles.ts`，集中默认样式与有效样式解析。
   - 扩展 `src/types.ts`，加入 `EditableTextField`、`TextStyleSettings`、`TextEffect`、`VerticalAlign` 等。
   - 重构 `src/utils/canvas.ts`，Canvas 根据当前编辑会话字段渲染。
   - `src/components/MemeEditor.tsx` 重构为可视化编辑器 + Selected Text Inspector。
   - 移除可见 Global Defaults，仅保留当前选中字段 Inspector。
   - `Apply these settings to ALL text boxes` 的语义：把当前选中文本框的有效样式复制到所有现有文本框；不影响未来新增文本框。
   - 修复 `react-rnd`/`prop-types` 在 Vite 浏览器环境中的 `process is not defined`：`vite.config.ts` 使用 `define` 替换 `process.env.NODE_ENV`。
   - Inspector 改为站点一致浅色风格，并在 `src/styles.css` 中引入 CSS 语义 token。

已生成的设计/审查文档：

- `.docs/plans/2026-06-09-mvp-design.md`
- `.docs/plans/2026-06-09-mvp-review.md`
- `.docs/plans/2026-06-10-editable-text-inspector-design.md`
- `.docs/plans/2026-06-10-editable-text-inspector-review.md`
- `.docs/plans/2026-06-10-remove-global-defaults-design.md`
- `.docs/plans/2026-06-10-remove-global-defaults-review.md`
- `.docs/plans/2026-06-10-inspector-theme-tokens-design.md`
- `.docs/plans/2026-06-10-inspector-theme-tokens-review.md`

当前最后一次确认：提交 `8400ed5` 后 `git status --short` 为空，工作区干净。

## 3. 关键上下文

用户明确偏好和决策：

- 项目遵循 KISS，纯前端静态站点，无后端依赖。
- 用户选择 MVP 先行，但后续逐步增强了编辑器能力。
- 样式方案选择普通 CSS，不使用 Tailwind/UI 组件库。
- 内置模板暂用 SVG 占位图，避免版权问题。
- 模板必须使用 `src/memes/*.json`，不要只用 TS 数据。
- 用户要求除下载外，也能复制图片到剪切板。
- 用户要求文本颜色拆分为 `Font Color` 和 `Outline Color`，默认白字黑描边。
- 用户一开始提出 Global Defaults + 单框覆盖，后来确认：有 `Apply these settings to ALL text boxes` 后不需要可见 Global Defaults。
- 当前最终 UI 语义：类似 Unity Inspector，选中一个文本框后右侧只编辑该对象属性。
- `Apply these settings to ALL text boxes`：让所有现有文本框立即拥有当前选中框的样式；不影响未来新增文本框。
- 用户要求 Inspector 样式与站点浅色风格一致；不要因早期 DSL 暗色描述而黑色；颜色不要散落硬编码，要为未来全站 dark mode 保留可能。
- 用户之前明确说“不更新 code map”，后续也遵循了该偏好，没有运行/更新 code map。

重要约束：

- 不要引入后端、数据库、API key、上传服务。
- GitHub Pages 子路径部署要考虑 `/open-meme/`。
- Canvas 导出必须使用原始图片尺寸，不能因为 DOM 预览缩放降低清晰度。
- 预览和导出应尽量一致，特别是 `Max Font Size`、Outline/Shadow/None、对齐和透明度。
- 新增/删除/拖拽/缩放/样式修改都只存在当前编辑会话，不写回 JSON。
- 成功下载或复制后清除 beforeunload 提醒；之后再编辑则重新提醒。

## 4. 关键发现

1. GitHub Pages 路径问题
   - 模板 JSON 中使用 `/memes/...` 在 GitHub Pages 子路径会失效。
   - 已在 `src/memes/index.ts` 通过 `import.meta.env.BASE_URL` 归一化解决。
   - `package.json` 有 `build:pages`: `tsc -b && vite build --base=/open-meme/`。

2. 预览缩放问题
   - 原先为了保持坐标一致让图片原始宽度显示，导致图片比容器大时出现横向滚动。
   - 现通过 `previewScale = image.clientWidth / image.naturalWidth` 解决。
   - Rnd 坐标显示时乘以 `previewScale`，拖拽/缩放结束写回逻辑坐标时除以 `previewScale`。

3. `react-rnd` 运行时报 `process is not defined`
   - 根因是依赖链中的 `prop-types` 访问 `process.env.NODE_ENV`。
   - 已在 `vite.config.ts` 的 `define` 中替换：`'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development')`。

4. Global Defaults 被移除
   - 曾经有 `globalStyle` state 和 Global Defaults 面板。
   - 用户反馈认知重复，最终移除。
   - 当前 `resolveTextStyle(field)` 使用 `DEFAULT_TEXT_STYLE + field.styleOverrides`。
   - 模板字段初始 `fontSize/color/align` 会写入初始 `styleOverrides`，以保留模板初始状态。

5. Inspector 主题 token
   - `src/styles.css` 中 `:root` 定义了语义变量，如 `--color-surface`、`--color-border`、`--color-text`、`--color-primary`、`--color-danger`、`--shadow-panel` 等。
   - Inspector 不再使用 `#1a1a1a/#2a2a2a/#444` 等暗色硬编码。
   - 颜色字面量目前应集中在 `:root` token 定义中，组件规则使用 `var(...)`。

6. Build 验证
   - 最近一次代码提交前多次执行过：
     - `npm run build`
     - `npm run build:pages`
   - 均通过。

## 5. 未完成事项

按优先级：

1. 手动运行/视觉验证当前编辑器
   - 需要用户或接手 Agent 启动 `npm run dev`，进入编辑器实际检查交互。
   - 重点确认：Inspector 浅色风格、拖拽/缩放、Apply to all、下载/复制、beforeunload 提醒。

2. 可能的交互细节优化
   - 当前 Inspector 内部嵌套 `Text Settings` 卡片，视觉是否过重需要实际看页面决定。
   - `react-rnd` resize handles 的视觉默认样式可能不够明显，未单独美化。
   - 小屏幕 Inspector 的表单布局可能仍需优化，当前仅基础响应式。

3. 后续 PRD 功能
   - `/create` Visual Template Configurator 尚未实现。
   - GitHub PR URL 生成器尚未实现。
   - JSON Schema 校验/GitHub Action 尚未实现。
   - GitHub Pages deploy workflow 尚未实现。

4. 代码结构进一步拆分
   - `src/components/MemeEditor.tsx` 现在较大，包含编辑器、Inspector、StyleInspector 等多个职责。
   - 后续可考虑拆成 `TextInspector.tsx`、`StyleInspector.tsx`、`MemePreview.tsx`，但目前不影响 build。

## 6. 建议接手路径

建议优先查看：

1. `src/components/MemeEditor.tsx`
   - 核心编辑器逻辑。
   - 重点函数：`addTextField`、`removeSelectedField`、`bringSelectedToTop`、`applySelectedStyleToAll`、`runImageAction`。
   - 重点渲染：`<Rnd>` 区块、`SelectedTextInspector`、`StyleInspector`。

2. `src/utils/textStyles.ts`
   - 默认样式和有效样式解析。
   - `DEFAULT_TEXT_STYLE`
   - `createEditableFields`
   - `createNewEditableField`
   - `resolveTextStyle`
   - `getCanvasFont`

3. `src/utils/canvas.ts`
   - Canvas 渲染、自动换行、自动缩小、Outline/Shadow/None、下载和复制。
   - 重点函数：`wrapText`、`fitText`、`drawTextField`、`renderEditableMemeToCanvas`、`downloadEditableMemeImage`、`copyEditableMemeToClipboard`。

4. `src/styles.css`
   - 全站 CSS token 与 Inspector 样式。
   - 重点看 `:root` token、`.inspector-panel`、`.inspector-card`、`.inspector-row`、`.editable-text-box`。

5. `vite.config.ts`
   - `process.env.NODE_ENV` define 修复。

建议先运行：

```powershell
npm run build
npm run build:pages
npm run dev
```

手动验证路径：

1. 首页选择 `Choice Road` 或 `Two Buttons` 模板。
2. 点击任意文本框，确认右侧只显示 Selected Text Inspector，没有 Global Defaults。
3. 修改 Font Color、Outline Color、Effect、Font Size、Max Font Size、Text Align、Vertical Align、Opacity。
4. 拖拽/缩放文本框，确认没有横向滚动、预览位置正确。
5. 点击 `Apply these settings to ALL text boxes`，确认所有现有文本框样式一致。
6. 点击 `+ Add text box`，确认新文本框使用默认白字黑描边，而不是被 Apply to all 的样式影响。
7. 下载 PNG，确认导出与预览大体一致。
8. 修改后未下载/复制时刷新页面，确认浏览器 beforeunload 提醒；下载或复制成功后再刷新不应提醒，除非继续修改。

## 7. 风险与注意事项

- 不要重新引入可见 Global Defaults。用户明确认为它和 Apply to all 重复。
- 不要把 Inspector 改回暗色。用户明确要求与站点一致的浅色风格。
- 不要在组件规则里继续散落颜色硬编码。颜色应尽量集中在 `:root` token 中，组件使用 `var(...)`。
- 不要删除 `vite.config.ts` 中的 `process.env.NODE_ENV` define，否则 `react-rnd` 依赖可能再次报 `process is not defined`。
- 不要把当前编辑会话写回 `src/memes/*.json`。用户要求编辑器内新增/删除/拖拽/样式修改刷新后恢复模板初始状态。
- 不要让 DOM 预览直接使用原图像素尺寸，否则会再次出现横向滚动。需要通过 `previewScale` 处理显示坐标。
- `Apply to all` 只影响现有文本框，不影响未来新增文本框；这是用户确认的语义。
- `src/components/MemeEditor.tsx` 较大，但目前经过构建验证；若要拆分，建议先保证行为不变。
- 用户此前拒绝更新 code map。除非用户重新要求，否则不要主动执行 code map 更新。

## 下一位 Agent 的第一步建议

第一步先运行 `git status --short` 确认工作区干净，然后执行 `npm run build && npm run build:pages` 验证提交后的基线。如果构建通过，启动 `npm run dev`，手动打开编辑器检查 Inspector 浅色样式、`react-rnd` 拖拽/缩放、`Apply to all` 和下载/复制链路。若发现 UI 问题，优先从 `src/components/MemeEditor.tsx` 和 `src/styles.css` 入手；若发现导出不一致，优先检查 `src/utils/canvas.ts` 与 `src/utils/textStyles.ts`。
