# Undo / Redo 实施代码审查

日期：2026-06-14
范围：

- 新增 `src/utils/useUndoableState.ts`
- 新增 `src/utils/useUndoableState.test.ts`
- 新增 `src/utils/useUndoKeyboard.ts`
- 修改 `src/components/MemeEditor.tsx`
- 修改 `src/components/TemplateConfigurator.tsx`

设计文档：`.docs/plans/2026-06-14-undo-redo-design.md`

## 统计

- 已审查文件：5
- 发现问题：5（P0×1，P1×4）
- 已确认非问题：1

## 问题列表

### #4（P0，逻辑错误）：undo/redo 后接续同 key 编辑会被合并

**位置**：`src/utils/useUndoableState.ts:153-196`

**复现**：
1. `t=0` 改字段 A 的文字（合并键 `text:a`）→ past=[初始]，head=`text:a`,t=0
2. `t=10` 改字段 A 的颜色（离散）→ past=[初始, 步骤1]，head=null,t=10
3. `t=20` 按 Ctrl+Z 撤销 → present 回到步骤 1 的值，head 从 past entry 还原为 `text:a`,t=0
4. `t=100` 用户继续敲键盘改文字（合并键 `text:a`）→ `100 - 0 = 100ms < 500ms` 且 key 相同 → 合并！present 直接覆盖，past 不变。

**后果**：用户撤销/重做后立刻继续编辑（最常见的工作流），会无声地丢失一步历史。redo 同理。

**根因**：undo/redo 在还原 head 元数据时连同旧 ts 一起还原，等于把"很久前的合并窗口"直接打开了。

**修复方案 A**（推荐）：还原 present 时把 head 强制开新一步：

```ts
return {
  past,
  present: previous.snapshot,
  future: [...current.future, headEntry],
  headKey: null,
  headTs: nowRef.current(),
};
```

redo 同理。补测试覆盖："undo 后立刻在窗口内做同 key setState，应产生独立一步"。

---

### #1（P1）：删除确认文案 + 整个 confirm 流程已不必要

**位置**：`src/components/MemeEditor.tsx:155`、`src/components/TemplateConfigurator.tsx:413`

**问题**：删除现在是离散动作进入撤销栈，"此操作无法撤销"文案不再成立，且 confirm 模态变成了多余的摩擦。

**修复**：去掉 `confirmRemoveSelectedField`，Delete/Backspace 与删除按钮都直接调 `removeSelectedField`，撤销作为兜底。两个组件都改。

---

### #3（P1）：Antd Tooltip 包裹 disabled Button 时 tooltip 失效

**位置**：`MemeEditor.tsx:246-253`、`TemplateConfigurator.tsx:523-530`

**问题**：disabled DOM 不触发鼠标事件，Tooltip 不显示。撤销栈空（最常见状态）时新用户看不到快捷键提示。

**修复方案 A**：用 `<span>` 包裹按钮使事件能冒泡到 Tooltip：

```tsx
<Tooltip title="撤销 (Ctrl+Z)">
  <span style={{ display: 'inline-block' }}>
    <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo} aria-label="撤销" />
  </span>
</Tooltip>
```

---

### #5（P1）：撤销/重做后 `selectedFieldId` 与 `fields` 不同步

**位置**：`MemeEditor.tsx:47, 53`、`TemplateConfigurator.tsx:62, 87`

**场景 A**（添加后撤销）：
- 用户点 Add → 自动选中新字段 → Ctrl+Z → fields 恢复但 selectedFieldId 仍指向已不存在的字段 → inspector 空白。

**场景 B**（删除后撤销）：
- 用户删除字段 A → 选中跳到字段 B → Ctrl+Z → A 又回来但 selectedFieldId 仍是 B → 视觉与选中不一致。

**修复方案 B**：用 effect 兜底（场景 A 完全修好；场景 B 接受不完美）：

```ts
useEffect(() => {
  if (selectedFieldId && !fields.some((f) => f.id === selectedFieldId)) {
    setSelectedFieldId(fields[0]?.id ?? '');
  }
}, [fields, selectedFieldId]);
```

两个组件都加。

---

### #6（P1）：reset effect 依赖 `template.textFields` 引用

**位置**：`MemeEditor.tsx:59-64`

**问题**：依赖 `template.textFields` 数组引用。当下没有 bug，但只要上游 `App.tsx` 的 `templates` 状态因任何原因被替换（例如未来加排序/筛选刷新），`template` 会变成新对象，effect 会以为切了模板，**清空用户当前的撤销栈和编辑成果**——埋雷。

**修复**：依赖列表只用 `template.id`（稳定的语义标识）。

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- only resetting on
// semantic template change, not when parent rebuilds the template object.
useEffect(() => {
  resetFields(createEditableFields(template.textFields));
  setSelectedFieldId(template.textFields[0]?.id ?? '');
  setStatusMessage('');
  setShouldWarnBeforeUnload(false);
}, [template.id, resetFields]);
```

## 已确认非问题

- **Configurator 中 updateField 的 patch-keys 派生合并键**：曾怀疑拖拽（4 键）与单字段微调（1 键）的合并键不同会割裂用户预期，验证后确认这是合理设计——不同语义动作分步是符合期望的。
- **clampBoxToImage 在 imageSize=0 时的边界**：`useImagePreviewScale` 默认 `{900, 600}`，不会出现 0 值。
- **导入 JSON 时 setDraft / setCropRect 不在撤销栈**：设计明确只对 fields 做撤销，非 bug。
