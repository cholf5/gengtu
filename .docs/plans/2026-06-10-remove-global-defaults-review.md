# Remove Global Defaults 代码审查

日期：2026-06-10

## 审查范围

- `src/components/MemeEditor.tsx`
- `src/utils/canvas.ts`
- `src/utils/textStyles.ts`
- `README.md`
- `.docs/plans/2026-06-10-remove-global-defaults-design.md`
- `.docs/plans/2026-06-10-editable-text-inspector-review.md`

## 审查重点

- Global Defaults 是否从可见 UI 中移除
- `resolveTextStyle` 是否使用 `DEFAULT_TEXT_STYLE + field.styleOverrides`
- `Apply to all` 是否把当前有效样式复制到所有现有文本框
- 新增文本框是否仍使用默认样式
- Canvas 下载/复制是否不再依赖编辑器里的 global style
- 预览/导出一致性

## 统计

- 已审查关键文件：5 个
- 发现问题：1 个
- 已修复问题：1 个

## 问题列表

### P1：模板字段的初始字号、颜色、对齐一度失效（已修复）

位置：`src/utils/textStyles.ts:19-35`

移除 Global Defaults 后，`resolveTextStyle(field)` 只合并 `DEFAULT_TEXT_STYLE + field.styleOverrides`。如果模板字段初始化时 `styleOverrides` 为空，模板 JSON 中的 `fontSize`、`color`、`align` 会完全不参与渲染，导致所有模板文本框都变成统一默认样式。

修复：`createEditableFields` 重新把模板字段的 `fontSize`、`color`、`align` 写入该字段初始 `styleOverrides`。由于 Global Defaults 已移除，这不会再造成全局默认无法控制已有字段的问题，同时能保留模板初始状态。

## 验证

修复后已通过：

- `npm run build`
- `npm run build:pages`

## 审查结论

Global Defaults 已从右侧 UI 中移除；当前 Inspector 只编辑选中文本框；`Apply these settings to ALL text boxes` 会把当前有效样式复制到所有现有文本框；新增文本框仍使用内部默认白字黑描边；下载和复制使用字段有效样式渲染。
