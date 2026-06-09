# Inspector Theme Tokens 设计

日期：2026-06-10

## 1. 目标

本次调整只改变视觉层，不改变编辑器状态、拖拽、导出、复制、Apply to all 等功能。当前 Inspector 使用了此前 UI DSL 中的暗色描述，导致右侧面板与站点整体浅色卡片风格不一致。目标是让 Inspector 回到与 Gallery、Preview panel、按钮等一致的浅色视觉语言，同时避免继续硬编码颜色值，为后续增加全站 dark mode 留出入口。

## 2. 主题 token 方案

在 `:root` 中建立全站语义 CSS 变量，例如 `--color-page-bg`、`--color-surface`、`--color-surface-muted`、`--color-border`、`--color-border-strong`、`--color-text`、`--color-text-muted`、`--color-primary`、`--color-primary-strong`、`--color-danger`、`--shadow-panel`。现有浅色站点的颜色作为这些变量默认值；未来需要 dark mode 时，可以在 `[data-theme="dark"]` 或 `@media (prefers-color-scheme: dark)` 下覆盖变量，不需要重新改组件样式。

为了控制范围，本次不强制迁移全部旧样式；重点是把 Inspector 相关的黑色硬编码、输入框、边框、文字、按钮、空状态和状态提示改为使用变量。若顺手调整基础 `.panel`、按钮、页面背景等，也只做小范围替换，不改变布局。

## 3. Inspector 视觉调整

Inspector 外层使用 `--color-surface`，卡片使用 `--color-surface-muted` 或同类浅色表面，输入框使用浅色背景，边框使用 `--color-border` / `--color-border-strong`，文字使用 `--color-text` / `--color-text-muted`。危险按钮使用 `--color-danger`，不写死红色。整体视觉应与当前站点白色卡片、浅灰背景和蓝色主按钮一致。

保留现有 Inspector 组件结构：选中文本框时显示 Selected Text Inspector，内部嵌套 Text Settings；没有选中文本框时显示空状态。样式修改不影响 `react-rnd` 拖拽缩放、不影响 Canvas 渲染、不影响 beforeunload 提醒。

## 4. 验证标准

- `npm run build` 通过。
- `npm run build:pages` 通过。
- Inspector 不再是黑色面板，视觉与站点浅色风格一致。
- Inspector 颜色使用 CSS 变量，不继续新增硬编码颜色值。
- 未来可通过覆盖 `:root` 语义变量扩展 dark mode。
