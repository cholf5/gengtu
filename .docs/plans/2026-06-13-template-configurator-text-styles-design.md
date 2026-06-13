# 模板配置器：每个 TextBox 的样式编辑

日期：2026-06-13
范围：`/create` 页面 (`TemplateConfigurator`) 在创建模板时允许调整每个 TextBox 的字体大小、颜色、字体、粗体/斜体、文字效果、对齐、不透明度、大写化等样式属性，并把作者的选择持久化到导出的模板 JSON。

---

## 上下文

- `TemplateConfigurator` 现在只让作者调 **布局**（id / placeholder / x,y,w,h / rotation）。`buildTemplateJson` 硬编码 `fontSize: 36 / color: '#ffffff' / align: 'center'`。
- `MemeEditor` 已经有完整的样式 inspector：`SelectedTextInspector` 内嵌 `TextStyleInspector`，能调 fontSize / fontColor / fontFamily / bold / italic / effect / outlineColor / outlineWidth / textAlign / verticalAlign / opacity / uppercase / maxFontSize，并通过 `EditableTextField.styleOverrides` 写到内存。
- 模板 JSON schema (`MemeTextField`) 当前只持久化 `fontSize / color / align` 三个样式字段。其余 `TextStyleSettings` 项均来自 `DEFAULT_TEXT_STYLE`。

目标：让配置器复用 `TextStyleInspector`，把作者调好的样式写进 JSON；老 JSON 不动；导出文件保持最小 diff。

---

## §1 类型与 JSON schema 演进

`MemeTextField` (`src/types.ts`) 增加 optional 样式字段，全部 optional，**不破坏老 JSON**：

```ts
export interface MemeTextField {
  id: string;
  placeholder: string;
  x: number; y: number; width: number; height: number;
  // 已有：
  fontSize: number;          // 保持必填（老 JSON 都有）
  color: string;             // 保持必填
  align: TextAlign;          // 保持必填
  rotation?: number;
  // 新增（全部 optional）：
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  verticalAlign?: VerticalAlign;
  effect?: TextEffect;
  outlineColor?: string;
  outlineWidth?: number;
  opacity?: number;
  maxFontSize?: number;
}
```

**读路径**：`createEditableFields` (`src/utils/textStyles.ts`) 把所有存在的 optional 字段一并搬进 `styleOverrides`，缺失字段 fall back 到 `DEFAULT_TEXT_STYLE`。老模板渲染结果不变。

**写路径**：`buildTemplateJson` 不再硬编码。改为：
- 总是写出 `fontSize / color / align`（向后兼容字段不变，保持 byte-for-byte 兼容）。
- 其余字段：只在 `effectiveStyle[key] !== DEFAULT_TEXT_STYLE[key]` 时写出。
- `effectiveStyle = resolveTextStyle(field)`，与渲染口径对齐。

→ 后果：作者只动了某 field 的 fontSize，导出 JSON 里那个 field 仅多 `fontSize` 一行；没动样式的 field JSON 形态与今天逐字相同。

---

## §2 配置器 Inspector 复用 `TextStyleInspector`

`TemplateFieldInspector` 在原布局区下方增加一个 Text Style 区块，**直接复用 `TextStyleInspector`**（与 MemeEditor 同一个组件）。

**props 扩展**

```ts
interface TemplateFieldInspectorProps {
  field: EditableTextField | null;
  imageSize: Size;
  effectiveStyle: TextStyleSettings;          // 新增
  onChange: (fieldId, patch: Partial<EditableTextField>) => void;
  onStyleChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void; // 新增
  onApplyStyleToAll: () => void;              // 新增
  onRemove: () => void;
  onDuplicate: () => void;
}
```

**渲染顺序**（同一 `Card` 内）

1. Field ID / Placeholder（保留）
2. X/Y/W/H（保留）
3. Rotation（保留）
4. `<TextStyleInspector title="Text Style" style={effectiveStyle} onChange={onStyleChange} />` ← 新增
5. `Apply to all` 按钮（新增；语义同 MemeEditor）

不加 "Bring to top" / "Content textarea"：配置器无 zIndex 操作面，文本由 Placeholder 覆盖。

**`TemplateConfigurator.tsx` 接线**

- `selectedEffectiveStyle = selectedField ? resolveTextStyle(selectedField) : DEFAULT_TEXT_STYLE`。
- 新增 `setFieldStyle(fieldId, key, value)` — 与 `MemeEditor` 同形：写到 `field.styleOverrides[key]`。
- 新增 `applyStyleToAll()` — 同 `MemeEditor.applySelectedStyleToAll`：当前有效样式覆盖到全体 `styleOverrides`。
- 透传给 `TemplateFieldInspector`。

新建 textbox 的初始样式继续为 `styleOverrides: {}`，与 MemeEditor 中"Add text box"出来的 box 视觉一致。

---

## §3 `buildTemplateJson` 写出策略 + 测试

**`buildTemplateJson` 改造**（`src/utils/templateConfigurator.ts`）

`serializeFieldStyle(effective: TextStyleSettings)`：

```ts
const persisted = {
  fontSize: effective.fontSize,
  color: effective.fontColor,
  align: effective.textAlign,
};
const optional: Partial<MemeTextField> = {};
if (effective.fontFamily    !== DEFAULT_TEXT_STYLE.fontFamily)    optional.fontFamily    = effective.fontFamily;
if (effective.bold          !== DEFAULT_TEXT_STYLE.bold)          optional.bold          = effective.bold;
if (effective.italic        !== DEFAULT_TEXT_STYLE.italic)        optional.italic        = effective.italic;
if (effective.uppercase     !== DEFAULT_TEXT_STYLE.uppercase)     optional.uppercase     = effective.uppercase;
if (effective.verticalAlign !== DEFAULT_TEXT_STYLE.verticalAlign) optional.verticalAlign = effective.verticalAlign;
if (effective.effect        !== DEFAULT_TEXT_STYLE.effect)        optional.effect        = effective.effect;
if (effective.outlineColor  !== DEFAULT_TEXT_STYLE.outlineColor)  optional.outlineColor  = effective.outlineColor;
if (effective.outlineWidth  !== DEFAULT_TEXT_STYLE.outlineWidth)  optional.outlineWidth  = effective.outlineWidth;
if (effective.opacity       !== DEFAULT_TEXT_STYLE.opacity)       optional.opacity       = effective.opacity;
if (effective.maxFontSize   !== DEFAULT_TEXT_STYLE.maxFontSize)   optional.maxFontSize   = effective.maxFontSize;
return { ...persisted, ...optional };
```

`buildTemplateJson`：每个 field 计算 `effective = resolveTextStyle(field)`，写出 `{ id, placeholder, x, y, w, h, ...serializeFieldStyle(effective), ...(rotation ? { rotation } : {}) }`。移除硬编码 `fontSize:36 / color:'#ffffff' / align:'center'`。

**`createEditableFields` 扩展**（`src/utils/textStyles.ts`）

把所有 optional 字段也搬进 `styleOverrides`（缺失则不写键，依赖 `DEFAULT_TEXT_STYLE`）。打开旧模板时新增控件从默认值起调，导出仍逐字相同。

**测试**（`src/utils/templateConfigurator.test.ts`）

1. `buildTemplateJson` — field 全用默认样式 → JSON 文本与今天逐字相同（保证 byte-for-byte 不退化）。
2. `buildTemplateJson` — field 改了 `bold + outlineColor` → 只多出这两个键，其它 optional 不出现。
3. `buildTemplateJson` — `textAlign: 'center'` 默认 → `align` 仍出现（向后兼容字段总写出）。

`createEditableFields` 测试补一个：JSON 含 `bold:true` → `styleOverrides.bold === true`。

**验收**

```bash
npx vitest run src/utils/templateConfigurator.test.ts
npx vitest run src/utils/textStyles.test.ts
npm run build
```

人工：`/create` 上传图、加 box、调字号/字体/粗体/效果，下载 JSON 检查只多动过的字段；放进 `public/memes/` 重启 dev，确认 Gallery 进编辑器后初始外观与配置器一致。
