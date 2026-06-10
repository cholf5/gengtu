# /create Visual Template Configurator MVP Design

## 背景与目标

本次实现 `/create` Visual Template Configurator 的 MVP。目标是让贡献者在纯前端页面中上传本地图片用于预览，通过拖拽/缩放文本框定义模板文字区域，并实时生成可复制的模板 JSON。实现必须遵守项目 KISS 原则：无后端、无数据库、无 API Key，不上传图片，不写回本地文件，也不改变现有内置模板加载方式。

本轮明确不实现 GitHub PR URL 生成器，也不处理图片自动上传。上传图片只通过 `URL.createObjectURL` 存在浏览器内存；生成 JSON 的 `url` 字段由用户手动填写，例如 `/memes/my-template.jpg`。字段 Inspector 先只做布局 MVP：编辑文本框 id、placeholder、x、y、width、height；JSON 为兼容当前 `MemeTemplate` 类型，会自动补充默认 `fontSize`、`color`、`align`。

## 页面入口、组件架构与 UI 库

不引入 React Router。`App.tsx` 根据 `window.location.pathname` 判断是否展示创建器，并在首页提供 “Create template” 入口。创建器组件命名为 `TemplateConfigurator`，放在 `src/components/TemplateConfigurator.tsx`。组件拥有独立状态：模板 `id/name/url/tags`、本地 object URL、图片原始尺寸、文本框数组、当前选中文本框、预览缩放比例和状态消息。

本轮引入 Ant Design。使用范围控制在 `/create`、共享 Inspector 和表单/反馈控件：`Upload.Dragger`、`Form`、`Input`、`InputNumber`、`Button`、`Card`、`Space`、`Alert`、`Typography`、`message` 等。Gallery、Hero、整体页面外壳暂不迁移，避免一次性改动过大。AntD 负责成熟表单和反馈组件；项目 CSS 继续负责图片预览层、拖拽文本框、品牌外壳和必要的响应式布局。

该实现不修改 `src/memes/*.json`，不改变 Gallery 的数据流。由于 `/create` 和 MemeEditor 都需要图片缩放、`react-rnd`、选中框和坐标换算，本轮不复制这些逻辑，而是先拆分共享层，再实现创建器。目标是减少 MemeEditor 体积，并确保两个工作区共用同一套坐标行为。

## 创建器交互

主布局沿用编辑器双栏结构：左侧为上传与图片预览，右侧为模板信息、字段 Inspector 和 JSON 输出。未上传图片时显示上传区域，支持选择文件和拖放，限制 `image/*`。上传成功后显示图片，图片加载完成后记录 natural width/height，并用 ResizeObserver 计算 `previewScale`。

文本框操作包括 `+ Add text box` 和 `Delete selected`。Add 在图片加载后启用，新文本框默认位于图片中部，宽度约 60%，高度约 16%，id 为 `text_1/text_2...`，placeholder 为 `Text 1/Text 2...`。文本框在预览层用共享的 `react-rnd` overlay 拖拽/缩放；显示坐标乘以 `previewScale`，拖拽/缩放结束后除以 `previewScale` 写回原图坐标，并 clamp 到图片边界。更换图片时重置文本框，因为坐标依赖原图尺寸，并显示提示。

## JSON 输出与复制

生成 JSON 严格匹配当前 `MemeTemplate`：

```json
{
  "id": "my-template",
  "name": "My Template",
  "url": "/memes/my-template.jpg",
  "tags": ["classic"],
  "textFields": []
}
```

每个 text field 包含 `id`、`placeholder`、`x`、`y`、`width`、`height`、`fontSize`、`color`、`align`。其中 `fontSize` 默认 `36`，`color` 默认 `#ffffff`，`align` 默认 `center`。坐标和尺寸输出为整数，提升可读性和稳定性。Tags 输入使用逗号分隔，生成时 trim 并过滤空值。

提供只读 JSON 预览和 `Copy JSON` 按钮。复制成功显示状态消息；复制失败时提示手动复制。MVP 不提供下载 JSON 文件和 Submit to GitHub。

## DRY 拆分计划

实现 `/create` 前先拆分 MemeEditor 中可复用且容易出错的部分：

- `src/utils/geometry.ts`：`clamp`、round、边界限制、显示坐标与原图坐标换算等纯函数。
- `src/hooks/useImagePreviewScale.ts`：管理 image ref、natural size、ResizeObserver 和 `previewScale`。
- `src/components/TextBoxOverlay.tsx`：封装 `react-rnd` 的选中态、拖拽、缩放、scale 换算和边界限制。
- `src/components/TextFieldsPreview.tsx`：负责图片 + 多文本框 overlay。MemeEditor 传入 meme 文本渲染器，TemplateConfigurator 传入 layout placeholder 渲染器。
- `src/components/TextStyleInspector.tsx`：从 MemeEditor 拆出现有样式 Inspector，并用 AntD 表单控件承载。
- `src/components/TemplateFieldInspector.tsx`：`/create` 专用布局 Inspector，编辑 `id/placeholder/x/y/width/height`。

这样新增创建器不会复制 MemeEditor 的 `previewScale + react-rnd + 坐标写回` 逻辑，同时能显著降低 MemeEditor 文件体积。

## 错误处理与验证

错误处理保持轻量：非图片文件显示提示；图片加载失败时清理 object URL 并提示重新选择；未加载图片时禁用 Add text box。JSON 预览上方显示非阻塞提示，例如缺少 id/name/url、未上传图片、没有文本框。提示不阻止复制，因为 MVP 以辅助贡献者为主。

样式策略是 AntD 负责表单/上传/反馈控件，`src/styles.css` 负责预览层和外壳；新增类名如 `.configurator-grid`、`.json-preview`、`.creator-text-box`，组件颜色继续尽量使用 CSS token 或 AntD theme token。验证方式包括：运行 `npm run build` 和 `npm run build:pages`；手动进入 `/create` 上传图片、添加/拖拽/缩放/删除文本框、编辑字段并复制 JSON；返回首页和现有编辑器，确认 Gallery、MemeEditor、下载/复制链路未受影响。
