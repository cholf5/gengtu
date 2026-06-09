# Editable Text Inspector 设计

日期：2026-06-10

## 1. 编辑器数据模型与状态优先级

本次改造会把编辑器从“模板字段 + 全局样式”升级为“当前编辑会话状态”。模板 JSON 仍只定义初始状态，包括文本框数量、位置、尺寸、默认文字和基础样式；进入编辑器后，会把 `template.textFields` 克隆成 `editableFields`，每个字段都有自己的 `id`、文本内容、位置、尺寸、层级和样式覆盖。全局样式作为默认值存在，例如 Font Color 默认 `#ffffff`、Outline Color 默认 `#000000`、字体、字号、ALL CAPS、描边宽度等；每个字段可以覆盖这些值，最终渲染时使用“字段样式 > 全局样式 > 模板默认值”的优先级。新增、删除、拖动、缩放、改样式都只更新 React state，不写回 JSON。下载或复制时使用当前编辑会话状态渲染 Canvas，而不是原始模板字段。

为了支持关闭/刷新提醒，会维护 `isDirty` 和 `hasExportedSinceLastEdit` 两个概念：任意编辑后标记 dirty；成功下载/复制后清除未导出提醒；之后如果继续编辑，再次提醒。

## 2. 可视化编辑与 Inspector 交互

可视化编辑区域引入 `react-rnd`。每个文本框在图片预览上显示为可选中的 Rnd 区块，坐标以模板原图像素为逻辑单位存储；预览自适应缩放时，显示层乘以 `previewScale`，拖拽/缩放结束时除以 `previewScale` 写回逻辑坐标，确保预览和 Canvas 导出一致。用户点击某个文本框后，该框高亮，并在右侧显示类似 Unity Inspector 的属性面板；Inspector 中可修改该文本框的内容、字体、Font Color、Outline Color、字号、ALL CAPS、Bold、Italic、Shadow/Outline/None、Outline Width、Max Font Size、Text Align、Vertical Align、Opacity 等。右侧不再采用“每行右侧齿轮弹窗”的主交互，而是统一由选中对象驱动 Inspector。

新增文本框会创建默认框并自动选中；删除只删除当前编辑会话里的字段，不影响模板 JSON。`Bring to top layer` 会把该字段的 `zIndex` 调整为当前最大值 + 1。渲染和导出时按 `zIndex` 从小到大绘制，避免视觉层级与导出不一致。

## 3. 右侧面板布局与全局/单框关系

右侧控制区会改成两层结构：上方是 Global Defaults，下方是 Selected Text Inspector。Global Defaults 用来设置新文本框和未覆盖字段的默认样式，包括 Font、Font Color、Outline Color、ALL CAPS、Bold、Italic、Effect、Outline Width、Max Font Size、Text Align、Vertical Align、Opacity。Selected Text Inspector 只有在选中文本框时显示；它采用暗色 Inspector 风格：`#2a2a2a` 背景、`#1a1a1a` 输入、`#555` 边框、浅色标签，布局尽量遵循设置面板参考。每个字段样式默认继承全局值；当用户在 Inspector 中修改某项，就把该项写入该字段的 `styleOverrides`，并优先于全局样式。

为了避免 UI 太复杂，MVP 中不做“继承/重置”按钮；字段如果被改过，就保持覆盖。`Apply these settings to ALL text boxes` 会把当前选中字段的有效样式复制到全局默认，并清空或同步其他字段覆盖，确保后续所有框看起来一致。

## 4. 文本效果、Canvas 渲染与未保存提醒

渲染能力会扩展到两种颜色和更多效果。默认 Font Color 为 `#ffffff`，Outline Color 为 `#000000`。`Effect` 支持 `outline`、`shadow`、`none`：选择 outline 时 Canvas 使用 `strokeText + fillText`，描边颜色来自 Outline Color，宽度来自 Outline Width；选择 shadow 时使用 `ctx.shadowColor/shadowBlur/shadowOffsetX/Y` 后再 `fillText`；选择 none 时只绘制填充文字。Bold/Italic 会进入 Canvas font 字符串，Opacity 会通过 `ctx.globalAlpha` 应用到该字段；Text Align 和 Vertical Align 分别影响水平/垂直排版。Max Font Size 作为自动缩放上限：当文本太多时，可以在字段高度和宽度范围内向下缩小字号，尽量让文本放进边界。DOM 预览会尽量模拟这些效果：outline 用 `text-shadow` 或 `-webkit-text-stroke`，shadow 用 CSS shadow，opacity 直接应用。

未保存提醒方面：任意修改文本、位置、尺寸、样式、新增、删除、层级都会标记 dirty。成功下载或复制后清除提醒；如果之后继续修改，再次标记 dirty。关闭/刷新使用 `beforeunload` 浏览器原生确认框。

## 5. 实施步骤、验证与风险控制

实现会分阶段控制风险。第一步扩展类型：新增 `EditableTextField`、`TextStyleSettings`、`TextEffect`、`VerticalAlign` 等类型，并把 Canvas 工具从 `template + textValues + globalStyle` 改为接收当前编辑会话字段列表。第二步重构 `MemeEditor`：初始化可编辑字段、选中字段、全局默认样式、dirty/export 状态，引入 `react-rnd` 实现拖拽缩放。第三步实现右侧 Global Defaults 与 Selected Text Inspector，提供新增、删除、Bring to top layer、Apply to all 等动作。第四步升级 DOM 预览和 Canvas 渲染，支持 Font Color、Outline Color、Bold、Italic、Effect、Outline Width、Max Font Size、Text Align、Vertical Align、Opacity，以及多行换行/自动缩小。第五步补充样式和 README，运行 `npm install`、`npm run build`、`npm run build:pages` 验证。

主要风险是状态复杂度上升和预览/导出不一致，因此会把“有效样式计算”和“Canvas 渲染”尽量抽成纯函数，避免在 UI 和导出逻辑各写一套规则。
