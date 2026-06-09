# Editable Text Inspector 代码审查

日期：2026-06-10

## 审查范围

- `README.md`
- `package.json`
- `package-lock.json`
- `src/components/MemeEditor.tsx`
- `src/styles.css`
- `src/types.ts`
- `src/utils/canvas.ts`
- `src/utils/textStyles.ts`
- `.docs/plans/2026-06-10-editable-text-inspector-design.md`

## 审查重点

- Editable Text Inspector 是否符合设计
- `react-rnd` 拖拽/缩放坐标与 `previewScale` 一致性
- 全局样式和单框覆盖优先级
- Canvas 渲染与 DOM 预览一致性
- dirty `beforeunload` 提醒
- 下载/复制成功清除提醒
- 新增/删除/层级
- 是否存在高风险 bug 或明显低复用问题

## 统计

- 已审查关键文件：8 个
- 已扫描高风险模式：样式覆盖、previewScale、beforeunload、resize、导出/复制、依赖变更
- 发现问题：3 个
- 已修复问题：2 个
- 已确认为预期行为：1 个

## 问题列表

### P1：`Apply these settings to ALL text boxes` 会清空所有字段覆盖（已确认为预期行为）

位置：`src/components/MemeEditor.tsx:187-195`

当前实现会将选中字段的有效样式写入全局样式，并清空所有字段的 `styleOverrides`：

```ts
const effectiveStyle = resolveTextStyle(selectedField, globalStyle);
setGlobalStyle(effectiveStyle);
setFields((current) => current.map((field) => ({ ...field, styleOverrides: {} })));
```

如果设计意图是“所有框看起来一致”，这个行为可以接受；如果用户期望“只把当前样式设置为全局默认，不破坏已有字段覆盖”，则会导致其他字段失去各自模板适配样式。

建议：确认交互语义。若按钮表示真正的 Apply to all，可以保留；若表示设置默认值，应改为只更新全局样式，不清空现有覆盖。

### P1：模板初始样式被当作单框覆盖，导致 Global Defaults 对已有文本框不生效（已修复）

位置：`src/utils/textStyles.ts:19-35`

当前初始化会把模板字段的 `fontSize`、`color`、`align` 写入 `styleOverrides`。这会让所有初始文本框从一开始就拥有单框覆盖，导致用户修改 Global Defaults 的 Font Color / Font Size / Text Align 时，已有模板文本框不会跟随变化，只有新增文本框会使用全局默认。

这与设计中的优先级“字段覆盖 > 全局样式 > 模板默认值”不完全一致。

建议：为 `EditableTextField` 增加 `templateStyle` 或 `baseStyle`，`styleOverrides` 初始为空；有效样式按 `globalStyle -> templateStyle -> styleOverrides` 或最终确认的优先级合并。

### P1：DOM 预览和 Canvas 导出在 Max Font Size 上可能不一致（已修复）

位置：

- `src/components/MemeEditor.tsx:29-46`
- `src/utils/canvas.ts:80-99`

Canvas 渲染使用 `Math.min(style.fontSize, style.maxFontSize)` 作为起始字号，但 DOM 预览直接使用 `style.fontSize`。如果用户设置 Font Size 100、Max Font Size 75，预览和导出的排版会明显不同。

建议：DOM 预览也使用 `Math.min(style.fontSize, style.maxFontSize)`，至少保证字号上限一致。

## 审查结论

构建验证已通过：

- `npm run build`
- `npm run build:pages`

当前实现完成了主要功能。第 1 个 P1 的后续设计已调整为移除 Global Defaults，`Apply to all` 直接把当前选中文本框的有效样式复制到所有现有文本框；第 2、第 3 个 P1 已修复，并重新通过 `npm run build` 与 `npm run build:pages` 验证。
