# Undo / Redo（操作队列 + Ctrl-Z 回退）设计

日期：2026-06-14
范围：`MemeEditor` 与 `TemplateConfigurator` 两个视图都接入撤销/重做。

## 1. 目标与范围

- 在编辑梗图（`MemeEditor`）和配置模板（`TemplateConfigurator`）两个视图，提供 `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` 撤销重做。
- 颗粒度按"语义动作"：撤销一整段连续打字、整次拖拽、整次滑块微调，而不是逐帧逐字符。
- 与现有业务代码尽量解耦：`useState` 下位替换为 `useUndoableState`，原有的 `setFields(updater)` 调用形态不变。

非目标（YAGNI）：

- 历史操作面板 / 可视化操作日志
- 跨刷新持久化（localStorage）
- 命令模式（do/undo command 类）、Immer、Zustand
- 跨视图共享一个操作栈

## 2. 关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 颗粒度 | **全状态快照 + 防抖/同类合并** | 不动业务代码结构；快照便宜（fields 数组通常 1–5 项）；命令模式过度设计 |
| Hook 形态 | **直接替换 useState** —— `useUndoableState(initial, options)` 返回 `{ state, setState, undo, redo, reset, canUndo, canRedo }`，`setState` 签名与 `useState` 一致并接受可选 `coalesceKey` | 调用点几乎不感知，迁移成本低 |
| 合并时间窗口 | **500ms** | 打字/拖拽节奏远小于此；有意识的两次操作通常间隔更长 |
| 输入框内 Ctrl+Z | **不拦截**，让浏览器处理输入框原生撤销栈 | 与现有 Delete/Backspace 处理（`MemeEditor.tsx:131-140`）一致；避免"打到一半 Ctrl+Z 把整个文本框删了"的惊吓 |
| 栈深上限 | **100 步** | 够用，超出后丢最旧 |
| 导出图片后 | **不清栈** | 导出只是输出，不是状态里程碑 |
| 切模板 / 切图片 | **清栈并重置 state** | 同时顺手修了 `MemeEditor` 不会因 `template` props 变化重置 fields 的隐患 |

## 3. 核心 hook：`useUndoableState`

位置：`src/utils/useUndoableState.ts`（纯逻辑，单测优先）。

### API

```ts
type Coalesce = { coalesceKey: string };

function useUndoableState<T>(
  initial: T | (() => T),
  options?: { limit?: number; windowMs?: number; now?: () => number },
): {
  state: T;
  setState: (updater: T | ((prev: T) => T), coalesce?: Coalesce) => void;
  undo: () => void;
  redo: () => void;
  reset: (next: T) => void;     // 切模板 / 切图片时清栈
  canUndo: boolean;
  canRedo: boolean;
};
```

### 内部数据结构

```ts
type Entry<T> = { snapshot: T; coalesceKey: string | null; ts: number };
// past:    Entry<T>[]   栈顶是"上一个稳定快照"
// present: T            当前 state
// future:  Entry<T>[]   redo 栈
```

### `setState` 合并规则（500ms 窗口、limit=100）

1. 计算 `next = typeof updater === 'function' ? updater(present) : updater`。
2. 若 `next === present`（引用相等）→ 不入栈，纯无操作。
3. 决定是否合并：
   - 当 `coalesce.coalesceKey` 存在
   - **且** `past` 顶部存在
   - **且** 顶部 `coalesceKey === coalesce.coalesceKey`
   - **且** `now() - 顶部.ts < windowMs`
   → **不 push**，仅更新 `present = next`，并把顶部的 `ts` 续到 `now()`（让连续操作持续合并）。
4. 否则把**当前 present**（旧值）推入 `past`，更新 `present = next`，清空 `future`，超过 `limit` 丢最旧。

> 关键语义：栈里存的是快照，但 push 的时机是**新操作发生时把"旧 present"入栈**，不是把新值入栈。这样 `undo()` 即 `present = past.pop().snapshot; future.push(旧present 的 entry)`，对称。

### `undo` / `redo`

纯栈操作，不参与合并；`undo` 时把当前 present 转为 entry 入 future（`coalesceKey` 置 null，时间戳取当前），反之亦然。

## 4. 合并键策略 — 哪些操作要合并

原则：**同一字段、同一类连续微调** 用同一 key；**离散的、有意为之的动作** 不传 key（每次独立成步）。

### MemeEditor 的调用点

| 操作 | 现有调用 | 合并键 |
|---|---|---|
| 输入文字 | `setFieldValue`（`text` 改） | `text:${fieldId}` |
| 旋转滑块 | `setFieldRotation` | `rotation:${fieldId}` |
| 字号 / 描边宽度 / 不透明度 等**数值滑块**类 style | `setFieldStyle(id, key, value)` | `style:${fieldId}:${key}` —— 但**仅当 value 类型为 number** |
| 颜色 / 对齐 / 粗体斜体 / 效果（outline\|shadow\|none）等**离散** style | `setFieldStyle(id, key, value)` | **无**（每次独立） |
| 拖动结束 | `setFields(updateField(id, {...rect}))`（`MemeEditor.tsx:233`） | `drag:${fieldId}` |
| 缩放结束 | 同上路径 | `resize:${fieldId}` |
| 添加 / 删除 / 置顶 / 应用样式到所有 | 各自一次 | **无** |

> 拖动 / 缩放：react-rnd 的 `onDragStop` / `onResizeStop` 一次拖拽只触发一次本身就够离散，但 500ms 内的相邻拖动合并成一步是合理的。

### TemplateConfigurator 的调用点

参考 MemeEditor 同样的规则套用 —— Configurator 修改的是 `MemeTextField`（更少的字段：`fontSize / color / align / 矩形`），同名字段沿用相同的"数值连续型 vs 离散型"区分。

### 实现机制：包一层业务 setter

为了不让合并键散落在 10+ 个调用点，在两个组件顶部各自包一组 setter：

```ts
const updateFieldText = (id, text) =>
  setFields(c => updateField(c, id, f => ({ ...f, text })), { coalesceKey: `text:${id}` });

const updateFieldRotation = (id, rotation) =>
  setFields(c => updateField(c, id, f => ({ ...f, rotation })), { coalesceKey: `rotation:${id}` });

const updateFieldStyleCoalesced = (id, key, value) => {
  const isNumeric = typeof value === 'number';
  setFields(
    c => updateField(c, id, f => ({ ...f, styleOverrides: { ...f.styleOverrides, [key]: value } })),
    isNumeric ? { coalesceKey: `style:${id}:${key}` } : undefined,
  );
};
```

`markEdited()` 的现有调用全部保留，行为不变。

## 5. 键盘快捷键和栈生命周期

### `useUndoKeyboard`（位置：`src/utils/useUndoKeyboard.ts`）

```ts
function useUndoKeyboard(undo, redo, canUndo, canRedo) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      // 与现有 Delete 处理一致：在输入框内不拦截，让浏览器原生撤销文本输入
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      // Ctrl+Z = undo, Ctrl+Shift+Z = redo, Ctrl+Y = redo
      if (key === 'z' && !e.shiftKey) {
        if (!canUndo) return;
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        if (!canRedo) return;
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [undo, redo, canUndo, canRedo]);
}
```

`canUndo / canRedo` 拦截：栈空时不调用 `preventDefault()`，让浏览器自由处理（虽然此时浏览器也无能为力，但形成习惯）。

### 栈的生命周期

| 时机 | 处理 |
|---|---|
| `MemeEditor` 挂载（点开模板） | hook 初始化 = 全新栈，`present = createEditableFields(template.textFields)` |
| `MemeEditor` 卸载（返回画廊 / 切模板） | React 自然销毁 |
| **同一个 `MemeEditor` 实例 props 切到另一个模板** | `useEffect([template.id]) → reset(createEditableFields(...))`。这同时修了"切模板后 fields 不重置"的现有隐患 |
| `TemplateConfigurator` 切图片 | 同理：`useEffect([imageId or src]) → reset(...)` |
| 导出图片 / 复制成功 | **不清栈** |

## 6. UI

`editor-toolbar` 里 `返回模板` 按钮右侧（Configurator 顶部工具栏同位置）：

```tsx
<Tooltip title="撤销 (Ctrl+Z)">
  <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo} />
</Tooltip>
<Tooltip title="重做 (Ctrl+Y)">
  <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo} />
</Tooltip>
```

Antd 自带 `UndoOutlined / RedoOutlined`，无新依赖。

## 7. 测试

`src/utils/useUndoableState.test.ts`，用 `@testing-library/react` 的 `renderHook`（已在 devDeps）。

| 用例 | 验证点 |
|---|---|
| 初始 `canUndo=false / canRedo=false` | 空栈 |
| 一次 `setState` 后 undo 回到初始 | 基本对称性 |
| undo → redo 回到 next | redo 栈 |
| undo 后再 setState → future 清空 | 分支丢弃 |
| 同 key 在 500ms 内多次 setState 只产生 1 步 | 合并 |
| 同 key 但超过 500ms → 产生 2 步 | 时间窗口 |
| 不同 key 即使 100ms 内 → 产生 2 步 | key 隔离 |
| 不传 key 永不合并 | 离散动作 |
| `next === present` 不入栈 | 引用相等短路 |
| 超出 limit 丢最旧 | 上限 |
| `reset(next)` 清空 past/future，present=next | 切模板 |

时间通过 hook 的 `now: () => number` 选项注入，避免 mock 全局。

## 8. 落地步骤

1. `src/utils/useUndoableState.ts` + 测试 —— **纯函数先行**，跑通测试再说。
2. `src/utils/useUndoKeyboard.ts`（小工具，行为通过手动验证）。
3. `MemeEditor.tsx`：
   - `useState` → `useUndoableState`
   - 加 `useEffect([template.id]) → reset(...)`
   - 把 ~10 处 setFields 调用按第 4 节的合并键表逐个改写
   - 工具栏加 Undo/Redo 按钮 + `useUndoKeyboard`
4. `TemplateConfigurator.tsx`：同样的接入；合并键表沿用第 4 节末尾的"同名字段同规则"原则；图片切换时 `reset`。

## 9. 风险与边界

- **react-rnd 拖拽中**：只在 `onDragStop` / `onResizeStop` 入栈，拖拽过程不入栈（现有代码本就是这样）。撤销不会回放拖拽中间帧。
- **textarea 焦点下用户预期**：原生 textarea 的 Ctrl+Z 只撤销文字输入；如果用户想撤销"刚才点了一下加粗"，需要先点出 textarea 焦点再按 Ctrl+Z。这是有意为之的取舍。
- **快照内存**：fields 通常很小，100 步 × 几 KB 在数量级上无压力。如未来 fields 结构膨胀，再考虑结构共享。
