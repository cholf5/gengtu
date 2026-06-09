# Open Meme MVP 设计

日期：2026-06-09

## 1. MVP 架构与范围

MVP 采用 Vite + React + TypeScript + 普通 CSS，整体保持纯静态站点，无后端、无数据库、无 API Key。源码按轻量结构组织：`src/memes/` 放模板 JSON 文件，`public/memes/` 放占位 SVG 图片，`src/components/` 放 Gallery、Editor、Controls 等组件，`src/utils/` 放 Canvas 渲染和文字换行逻辑。首版只覆盖核心闭环：用户进入首页浏览模板，选择模板后进入编辑区，输入每个文字框内容，调整基础样式，然后下载生成图片或直接复制图片到剪切板。

`/create` 可视化模板配置器、GitHub PR URL、完整 JSON Schema 校验和 GitHub Pages workflow 暂不进入第一轮编码，避免 MVP 被贡献流程拖慢；但目录和数据模型会按 PRD 预留，方便后续无痛接入。该范围优先验证产品核心价值：用户是否能基于内置模板快速生成并分享 meme。

## 2. 核心页面、组件与用户流程

MVP 采用单页应用内状态切换：默认显示模板 Gallery，点击模板后进入 Meme Editor，并提供返回按钮。Gallery 负责搜索、响应式卡片网格和模板选择；Editor 负责图片预览、文字输入、样式控制、生成操作。Editor 内部会把模板的 `textFields` 映射成动态输入框，每个字段保存用户输入，并继承字段默认样式。

生成结果不依赖后端。点击“下载”时使用 Canvas 合成图片并触发本地文件下载；点击“复制图片”时复用同一套 Canvas 渲染逻辑生成 Blob，再通过浏览器 Clipboard API 写入剪切板。若浏览器不支持图片复制、当前环境不满足权限要求，或复制失败，则展示清晰提示，建议用户改用下载。

## 3. 模板数据、占位图片与 Canvas 渲染

MVP 直接使用 `src/memes/*.json` 模板文件，贴合 PRD 的贡献模型。实现上使用 Vite 的 `import.meta.glob` 在构建时加载这些 JSON，并转换成模板列表；未来新增模板时只要添加 JSON 文件和对应 `public/memes/` 图片即可，不需要改代码。模板字段遵循 PRD 语义，包含 `id`、`name`、`url`、`tags`、`textFields`，每个文本框包含位置、尺寸、默认字号、颜色和对齐方式等配置。

内置 2-3 个简单 SVG 占位模板放到 `public/memes/`，例如“两按钮”“上方/下方文字”“选择困难”等，避免版权问题。Canvas 渲染会加载原图，按原始尺寸创建画布，再绘制每个文本框。文字渲染支持按边界宽度自动换行，默认使用白字黑描边，并支持字号、颜色、字体、居中/左/右对齐和英文大写开关。预览层先用绝对定位 DOM 文本覆盖图片，最终导出用 Canvas 保证清晰度。

## 4. 状态管理、错误处理与浏览器兼容

状态管理保持组件本地化：顶层 `App` 保存当前选中模板和搜索词，Editor 保存每个文本框输入值、全局样式选项和生成状态，不引入 Redux/Zustand。图片加载失败时，卡片和编辑器显示友好占位提示；Canvas 生成失败时按钮恢复可用并展示错误信息。

复制到剪切板使用 `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`，并做能力检测：如果当前浏览器、非 HTTPS 环境或权限限制导致失败，展示“复制不可用，请下载图片”的提示。下载功能作为稳定兜底始终保留。模板加载时做轻量运行时防护：过滤明显缺失 `id/name/url/textFields` 的项，并在控制台输出警告；完整 JSON Schema 校验和 GitHub Action 放到第二阶段。整个错误处理以“不崩溃、可继续操作”为目标。

## 5. 测试、开发步骤与验收标准

MVP 开发会先搭建 Vite React TypeScript 工程，再建立 `public/memes/`、`src/memes/*.json`、模板类型、加载器和 Canvas 工具函数。随后实现 Gallery、Editor、样式控制、下载与复制剪切板，最后补充基础 README/使用说明。测试层面先采用轻量策略：运行 TypeScript 构建检查，手动验证模板搜索、选择、输入、换行、下载、复制失败提示等关键路径；Canvas 文本换行函数抽成纯函数，后续如引入 Vitest 可优先覆盖它。

MVP 验收标准：`npm run dev` 可启动；首页能显示 2-3 个本地占位模板；搜索可过滤；选择模板后预览文字能实时变化；下载能生成 PNG；支持的浏览器可复制图片，不支持时有明确提示；项目仍保持纯静态、无服务端依赖。
