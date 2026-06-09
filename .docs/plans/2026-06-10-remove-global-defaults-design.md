# Remove Global Defaults 设计

日期：2026-06-10

## 1. 目标

当前 Editable Text Inspector 右侧面板同时包含 Global Defaults 和 Selected Text Inspector。由于 Inspector 底部已经提供 `Apply these settings to ALL text boxes`，Global Defaults 与批量应用能力在用户心智上存在重复：一个是改全局默认，一个是把当前设置同步到全部文本框。用户反馈希望更接近 Unity Editor Inspector 的交互方式，即选中某个对象后，右侧只显示该对象属性。因此本次调整目标是移除可见的 Global Defaults 面板，降低 UI 复杂度，并让所有样式编辑都围绕当前选中文本框进行。

## 2. 交互设计

右侧面板改为只显示当前选中文本框的 Inspector。用户点击图片上的文本框后，Inspector 展示并编辑该文本框的内容、字体、Font Color、Outline Color、ALL CAPS、Bold、Italic、Effect、Outline Width、Max Font Size、Text Align、Vertical Align、Opacity，以及 remove、Bring to top layer、Apply these settings to ALL text boxes 等动作。如果没有选中文本框，则显示空状态提示用户选择或新增文本框。

`Apply these settings to ALL text boxes` 的语义确认如下：点击后，所有现有文本框立即应用当前选中文本框的有效样式，视觉上全部一致。它不负责未来新增文本框的默认值；未来新增文本框仍使用内部默认样式。

## 3. 状态与样式优先级

实现上仍保留一个不可见的 `DEFAULT_TEXT_STYLE`，默认 Font Color 为 `#ffffff`，Outline Color 为 `#000000`，用于新增文本框和字段缺省样式兜底，但用户不再直接编辑它。每个文本框持有自己的 `styleOverrides`。Inspector 修改当前选中文本框时，直接写入该文本框的 `styleOverrides`。`resolveTextStyle(field)` 使用 `DEFAULT_TEXT_STYLE + field.styleOverrides` 得到有效样式。

`Apply these settings to ALL text boxes` 会先解析当前选中文本框的有效样式，然后把该完整样式写入所有现有文本框的 `styleOverrides`，确保所有现有文本框看起来一致。Canvas 渲染和 DOM 预览都使用同一套有效样式解析逻辑，避免导出与预览不一致。

## 4. 实施与验证

主要改动包括：移除 `MemeEditor` 中的 `globalStyle` state 和 Global Defaults 的 `StyleInspector` 渲染；修改 `resolveTextStyle` 调用签名，减少对全局样式参数的依赖；更新 Canvas 工具，使导出只依赖 `template`、`fields` 和内部默认样式；调整 `Apply to all` 实现为复制当前有效样式到所有字段；更新 README 和审查文档中关于 Global Defaults 的描述。

验证标准：`npm run build` 和 `npm run build:pages` 均通过；进入编辑器后右侧不再显示 Global Defaults；选中文本框后 Inspector 可编辑单框样式；Apply to all 后所有现有文本框样式一致；新增文本框仍使用默认白字黑描边；下载和复制结果与预览一致。
