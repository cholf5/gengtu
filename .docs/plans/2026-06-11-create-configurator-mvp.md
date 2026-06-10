# /create Visual Template Configurator MVP 实施计划

> **给 Claude：** 必需的子技能：使用 com-executing-plans 逐任务实施此计划。

**目标：** 实现 `/create` 可视化模板配置器 MVP，并在实现前拆分 MemeEditor 的共享预览、拖拽、缩放和 Inspector 逻辑，避免重复代码。

**架构：** 先引入 Ant Design，仅用于 `/create`、Inspector 和表单/反馈控件；Gallery、Hero 和整体外壳暂不迁移。将 MemeEditor 中的图片缩放、`react-rnd` overlay、坐标换算、文本样式 Inspector 拆成共享 hook/组件，再基于这些共享层实现 TemplateConfigurator。

**技术栈：** React、TypeScript、Vite、react-rnd、Ant Design、普通 CSS、Vitest（新增轻量单元测试）。

---

## 参考文档与约束

- 设计文档：`.docs/plans/2026-06-11-create-configurator-mvp-design.md`
- PRD：`.docs/PRD.md:50-61`
- 当前核心文件：`src/components/MemeEditor.tsx`、`src/utils/textStyles.ts`、`src/styles.css`
- 约束：无后端、无数据库、无 API Key；上传图片只存在浏览器内存；不写回 `src/memes/*.json`；`/create` 不实现 GitHub URL；Ant Design 使用范围限于 `/create` 和 Inspector。

---

### 任务 1：安装 Ant Design 和测试工具

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json` 或当前包管理器锁文件（如果 npm 生成）
- 修改：`src/main.tsx`

**步骤 1：安装依赖**

运行：

```powershell
npm install antd
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

预期：依赖安装成功，`package.json` 出现 `antd`，devDependencies 出现测试依赖。

**步骤 2：添加测试脚本**

在 `package.json` 的 `scripts` 中加入：

```json
"test": "vitest run"
```

保持现有脚本：

```json
"dev": "vite",
"build": "tsc -b && vite build",
"build:pages": "tsc -b && vite build --base=/open-meme/",
"preview": "vite preview"
```

**步骤 3：引入 AntD 样式**

修改 `src/main.tsx`，在项目 CSS 前或后引入 AntD reset。推荐放在 `src/styles.css` 前，让项目 CSS 能覆盖预览层细节：

```tsx
import 'antd/dist/reset.css';
import './styles.css';
```

**步骤 4：验证安装不破坏构建**

运行：

```powershell
npm run build
```

预期：PASS，无 TypeScript 错误，无 `process is not defined` 相关构建错误。

---

### 任务 2：为 geometry 纯函数编写失败测试

**文件：**
- 创建：`src/utils/geometry.test.ts`
- 创建：`src/utils/geometry.ts`

**步骤 1：创建失败测试**

创建 `src/utils/geometry.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { clamp, clampBoxToImage, fromPreviewRect, roundRect, toPreviewRect } from './geometry';

describe('geometry helpers', () => {
  it('clamps numbers into a range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(50, 0, 10)).toBe(10);
  });

  it('converts rects between original and preview coordinates', () => {
    const original = { x: 10, y: 20, width: 100, height: 50 };
    expect(toPreviewRect(original, 0.5)).toEqual({ x: 5, y: 10, width: 50, height: 25 });
    expect(fromPreviewRect({ x: 5, y: 10, width: 50, height: 25 }, 0.5)).toEqual(original);
  });

  it('rounds rect values for JSON output', () => {
    expect(roundRect({ x: 1.2, y: 1.6, width: 10.4, height: 10.5 })).toEqual({
      x: 1,
      y: 2,
      width: 10,
      height: 11,
    });
  });

  it('keeps boxes inside image bounds', () => {
    expect(
      clampBoxToImage(
        { x: 95, y: -5, width: 20, height: 10 },
        { width: 100, height: 80 },
        { minWidth: 8, minHeight: 6 },
      ),
    ).toEqual({ x: 80, y: 0, width: 20, height: 10 });
  });
});
```

创建空的 `src/utils/geometry.ts`：

```ts
export {};
```

**步骤 2：运行测试以验证它失败**

运行：

```powershell
npm run test -- src/utils/geometry.test.ts
```

预期：FAIL，显示 `No export named clamp` 或类似导出不存在错误。

---

### 任务 3：实现 geometry 纯函数

**文件：**
- 修改：`src/utils/geometry.ts`
- 测试：`src/utils/geometry.test.ts`

**步骤 1：编写最少实现**

将 `src/utils/geometry.ts` 改为：

```ts
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoxConstraints {
  minWidth: number;
  minHeight: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function toPreviewRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function fromPreviewRect(rect: Rect, scale: number): Rect {
  const safeScale = scale || 1;
  return {
    x: rect.x / safeScale,
    y: rect.y / safeScale,
    width: rect.width / safeScale,
    height: rect.height / safeScale,
  };
}

export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function clampBoxToImage(rect: Rect, imageSize: Size, constraints: BoxConstraints): Rect {
  const width = clamp(rect.width, constraints.minWidth, imageSize.width);
  const height = clamp(rect.height, constraints.minHeight, imageSize.height);

  return {
    x: clamp(rect.x, 0, Math.max(0, imageSize.width - width)),
    y: clamp(rect.y, 0, Math.max(0, imageSize.height - height)),
    width,
    height,
  };
}
```

**步骤 2：运行测试以验证它通过**

运行：

```powershell
npm run test -- src/utils/geometry.test.ts
```

预期：PASS，4 个测试通过。

**步骤 3：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。

---

### 任务 4：抽出图片缩放 hook

**文件：**
- 创建：`src/hooks/useImagePreviewScale.ts`
- 修改：`src/components/MemeEditor.tsx`

**步骤 1：创建 hook**

创建 `src/hooks/useImagePreviewScale.ts`：

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../utils/geometry';

const DEFAULT_IMAGE_SIZE: Size = { width: 900, height: 600 };

export function useImagePreviewScale(imageSrc: string) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [imageSize, setImageSize] = useState<Size>(DEFAULT_IMAGE_SIZE);

  const updatePreviewScale = useCallback(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setImageSize({ width: naturalWidth, height: naturalHeight });
    setPreviewScale(image.clientWidth / naturalWidth || 1);
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    updatePreviewScale();

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [imageSrc, updatePreviewScale]);

  return { imageRef, imageSize, previewScale, updatePreviewScale };
}
```

**步骤 2：替换 MemeEditor 内部缩放状态**

在 `src/components/MemeEditor.tsx` 中：

- 删除 `useRef` import。
- 删除本地 `previewScale`、`imageSize` state。
- 删除本地 `imageRef`。
- 删除 `useEffect` 中 ResizeObserver 逻辑。
- 引入：

```ts
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
```

在组件内加入：

```ts
const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(template.url);
```

**步骤 3：运行构建验证行为未变**

运行：

```powershell
npm run build
```

预期：PASS。MemeEditor 中 `<img ref={imageRef} ... onLoad={updatePreviewScale} />` 仍存在。

---

### 任务 5：抽出 TextBoxOverlay 组件

**文件：**
- 创建：`src/components/TextBoxOverlay.tsx`
- 修改：`src/components/MemeEditor.tsx`
- 修改：`src/styles.css`（如需重命名 class，尽量兼容现有 `.editable-text-box`）

**步骤 1：创建组件**

创建 `src/components/TextBoxOverlay.tsx`：

```tsx
import { Rnd } from 'react-rnd';
import type { Rect, Size } from '../utils/geometry';
import { clampBoxToImage, fromPreviewRect, toPreviewRect } from '../utils/geometry';

interface TextBoxOverlayProps {
  rect: Rect;
  imageSize: Size;
  previewScale: number;
  selected: boolean;
  zIndex: number;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
  onSelect: () => void;
  onChange: (rect: Rect) => void;
}

export function TextBoxOverlay({
  rect,
  imageSize,
  previewScale,
  selected,
  zIndex,
  className = 'editable-text-box',
  minWidth = 40,
  minHeight = 24,
  children,
  onSelect,
  onChange,
}: TextBoxOverlayProps) {
  const previewRect = toPreviewRect(rect, previewScale);

  return (
    <Rnd
      bounds="parent"
      className={`${className} ${selected ? 'is-selected' : ''}`}
      position={{ x: previewRect.x, y: previewRect.y }}
      size={{ width: previewRect.width, height: previewRect.height }}
      style={{ zIndex }}
      minWidth={minWidth * previewScale}
      minHeight={minHeight * previewScale}
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation();
        onSelect();
      }}
      onDragStart={onSelect}
      onDragStop={(_, data) => {
        const next = fromPreviewRect({ ...previewRect, x: data.x, y: data.y }, previewScale);
        onChange(clampBoxToImage(next, imageSize, { minWidth, minHeight }));
      }}
      onResizeStart={onSelect}
      onResizeStop={(_, __, ref, ___, position) => {
        const next = fromPreviewRect(
          {
            x: position.x,
            y: position.y,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          },
          previewScale,
        );
        onChange(clampBoxToImage(next, imageSize, { minWidth, minHeight }));
      }}
    >
      {children}
    </Rnd>
  );
}
```

**步骤 2：在 MemeEditor 使用 TextBoxOverlay**

在 `src/components/MemeEditor.tsx` 中删除 `Rnd` import，加入：

```ts
import { TextBoxOverlay } from './TextBoxOverlay';
```

将原 `<Rnd>...</Rnd>` 替换为：

```tsx
<TextBoxOverlay
  key={field.id}
  rect={{ x: field.x, y: field.y, width: field.width, height: field.height }}
  imageSize={imageSize}
  previewScale={previewScale}
  selected={field.id === selectedFieldId}
  zIndex={field.zIndex}
  minWidth={60}
  minHeight={32}
  onSelect={() => setSelectedFieldId(field.id)}
  onChange={(rect) => {
    setFields((current) =>
      updateField(current, field.id, (currentField) => ({
        ...currentField,
        ...rect,
      })),
    );
    markEdited();
  }}
>
  <div className={`preview-text ${getVerticalClass(style.verticalAlign)}`} style={getPreviewTextStyle(style, previewScale)}>
    {getPreviewText(field, style)}
  </div>
</TextBoxOverlay>
```

**步骤 3：删除 MemeEditor 内重复 clamp**

如果 `clamp` 只被旧拖拽逻辑使用，删除本地 `clamp` 函数。

**步骤 4：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。MemeEditor 拖拽/缩放类型无错误。

---

### 任务 6：抽出 TextFieldsPreview 组件

**文件：**
- 创建：`src/components/TextFieldsPreview.tsx`
- 修改：`src/components/MemeEditor.tsx`

**步骤 1：创建组件**

创建 `src/components/TextFieldsPreview.tsx`：

```tsx
import type { EditableTextField } from '../types';
import type { Size } from '../utils/geometry';
import { TextBoxOverlay } from './TextBoxOverlay';

interface TextFieldsPreviewProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  imageUrl: string;
  imageAlt: string;
  fields: EditableTextField[];
  selectedFieldId: string;
  imageSize: Size;
  previewScale: number;
  boxClassName?: string;
  onImageLoad: () => void;
  onSelectField: (fieldId: string) => void;
  onFieldRectChange: (fieldId: string, rect: Pick<EditableTextField, 'x' | 'y' | 'width' | 'height'>) => void;
  renderField: (field: EditableTextField) => React.ReactNode;
}

export function TextFieldsPreview({
  imageRef,
  imageUrl,
  imageAlt,
  fields,
  selectedFieldId,
  imageSize,
  previewScale,
  boxClassName,
  onImageLoad,
  onSelectField,
  onFieldRectChange,
  renderField,
}: TextFieldsPreviewProps) {
  const sortedFields = fields.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="meme-preview">
      <img ref={imageRef} src={imageUrl} alt={imageAlt} onLoad={onImageLoad} />
      {sortedFields.map((field) => (
        <TextBoxOverlay
          key={field.id}
          rect={{ x: field.x, y: field.y, width: field.width, height: field.height }}
          imageSize={imageSize}
          previewScale={previewScale}
          selected={field.id === selectedFieldId}
          zIndex={field.zIndex}
          className={boxClassName}
          minWidth={60}
          minHeight={32}
          onSelect={() => onSelectField(field.id)}
          onChange={(rect) => onFieldRectChange(field.id, rect)}
        >
          {renderField(field)}
        </TextBoxOverlay>
      ))}
    </div>
  );
}
```

**步骤 2：替换 MemeEditor 预览循环**

在 `src/components/MemeEditor.tsx` 中：

- 删除 `sortedFields` useMemo。
- 引入 `TextFieldsPreview`。
- 用组件替换 `<div className="meme-preview">...fields.map...</div>`。

示例：

```tsx
<TextFieldsPreview
  imageRef={imageRef}
  imageUrl={template.url}
  imageAlt={template.name}
  fields={fields}
  selectedFieldId={selectedFieldId}
  imageSize={imageSize}
  previewScale={previewScale}
  onImageLoad={updatePreviewScale}
  onSelectField={setSelectedFieldId}
  onFieldRectChange={(fieldId, rect) => {
    setFields((current) => updateField(current, fieldId, (field) => ({ ...field, ...rect })));
    markEdited();
  }}
  renderField={(field) => {
    const style = resolveTextStyle(field);
    return (
      <div className={`preview-text ${getVerticalClass(style.verticalAlign)}`} style={getPreviewTextStyle(style, previewScale)}>
        {getPreviewText(field, style)}
      </div>
    );
  }}
/>
```

**步骤 3：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。

---

### 任务 7：抽出并用 AntD 改写 TextStyleInspector

**文件：**
- 创建：`src/components/TextStyleInspector.tsx`
- 修改：`src/components/MemeEditor.tsx`
- 修改：`src/styles.css`

**步骤 1：创建 AntD 版 TextStyleInspector**

创建 `src/components/TextStyleInspector.tsx`：

```tsx
import { Checkbox, ColorPicker, Form, InputNumber, Radio, Select, Slider, Space, Typography } from 'antd';
import type { Color } from 'antd/es/color-picker';
import type { TextAlign, TextEffect, TextStyleSettings, VerticalAlign } from '../types';

const FONT_OPTIONS = ['Impact', 'Arial Black', 'Arial', 'Verdana', 'Comic Sans MS', 'system-ui'];
const EFFECT_OPTIONS: TextEffect[] = ['outline', 'shadow', 'none'];
const TEXT_ALIGN_OPTIONS: TextAlign[] = ['left', 'center', 'right'];
const VERTICAL_ALIGN_OPTIONS: VerticalAlign[] = ['top', 'middle', 'bottom'];

interface TextStyleInspectorProps {
  title: string;
  style: TextStyleSettings;
  onChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void;
}

function toHex(value: string | Color) {
  return typeof value === 'string' ? value : value.toHexString();
}

export function TextStyleInspector({ title, style, onChange }: TextStyleInspectorProps) {
  return (
    <div className="inspector-card">
      <Typography.Title level={4}>{title}</Typography.Title>
      <Form layout="vertical" size="middle">
        <Form.Item label="Font">
          <Select
            value={style.fontFamily}
            options={FONT_OPTIONS.map((font) => ({ value: font, label: font }))}
            onChange={(value) => onChange('fontFamily', value)}
          />
        </Form.Item>

        <Space wrap>
          <Form.Item label="Font Color">
            <ColorPicker value={style.fontColor} onChangeComplete={(color) => onChange('fontColor', toHex(color))} />
          </Form.Item>
          <Form.Item label="Outline Color">
            <ColorPicker value={style.outlineColor} onChangeComplete={(color) => onChange('outlineColor', toHex(color))} />
          </Form.Item>
        </Space>

        <Form.Item>
          <Space wrap>
            <Checkbox checked={style.uppercase} onChange={(event) => onChange('uppercase', event.target.checked)}>
              ALL CAPS
            </Checkbox>
            <Checkbox checked={style.bold} onChange={(event) => onChange('bold', event.target.checked)}>
              Bold
            </Checkbox>
            <Checkbox checked={style.italic} onChange={(event) => onChange('italic', event.target.checked)}>
              Italic
            </Checkbox>
          </Space>
        </Form.Item>

        <Form.Item label="Effect">
          <Radio.Group value={style.effect} onChange={(event) => onChange('effect', event.target.value)}>
            {EFFECT_OPTIONS.map((effect) => (
              <Radio.Button key={effect} value={effect}>
                {effect}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Font Size">
          <InputNumber min={12} max={160} value={style.fontSize} onChange={(value) => onChange('fontSize', value ?? style.fontSize)} />
        </Form.Item>

        <Form.Item label="Outline Width">
          <InputNumber min={0} max={24} value={style.outlineWidth} onChange={(value) => onChange('outlineWidth', value ?? style.outlineWidth)} />
        </Form.Item>

        <Form.Item label="Max Font Size (px)">
          <InputNumber min={12} max={180} value={style.maxFontSize} onChange={(value) => onChange('maxFontSize', value ?? style.maxFontSize)} />
        </Form.Item>

        <Form.Item label="Text Align">
          <Select
            value={style.textAlign}
            options={TEXT_ALIGN_OPTIONS.map((align) => ({ value: align, label: align }))}
            onChange={(value) => onChange('textAlign', value)}
          />
        </Form.Item>

        <Form.Item label="Vertical Align">
          <Select
            value={style.verticalAlign}
            options={VERTICAL_ALIGN_OPTIONS.map((align) => ({ value: align, label: align }))}
            onChange={(value) => onChange('verticalAlign', value)}
          />
        </Form.Item>

        <Form.Item label={`Opacity ${style.opacity.toFixed(2)}`}>
          <Slider min={0} max={1} step={0.05} value={style.opacity} onChange={(value) => onChange('opacity', value)} />
        </Form.Item>
      </Form>
    </div>
  );
}
```

**步骤 2：从 MemeEditor 删除旧 StyleInspector**

在 `src/components/MemeEditor.tsx`：

- 删除 `FONT_OPTIONS`、`EFFECT_OPTIONS`、`TEXT_ALIGN_OPTIONS`、`VERTICAL_ALIGN_OPTIONS`。
- 删除本地 `StyleInspector` 函数。
- 引入：

```ts
import { TextStyleInspector } from './TextStyleInspector';
```

将 `<StyleInspector ... />` 改为：

```tsx
<TextStyleInspector title="Text Settings" style={effectiveStyle} onChange={onStyleChange} />
```

**步骤 3：清理不再使用的 CSS**

在 `src/styles.css` 中保留 `.inspector-card`、`.inspector-panel`、`.preview-text` 等外壳样式。可删除只服务旧原生控件的选择器，例如 `.inspector-row input`、`.option-row`、`.slider-row`，但不要删除仍被其他组件使用的 `.field-control`。

**步骤 4：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。若 AntD ColorPicker 类型不匹配，按实际 antd 类型调整 `toHex`，但保持输出为 hex string。

---

### 任务 8：抽出 SelectedTextInspector

**文件：**
- 创建：`src/components/SelectedTextInspector.tsx`
- 修改：`src/components/MemeEditor.tsx`

**步骤 1：创建组件**

创建 `src/components/SelectedTextInspector.tsx`：

```tsx
import { Button, Card, Input, Space, Typography } from 'antd';
import type { EditableTextField, TextStyleSettings } from '../types';
import { TextStyleInspector } from './TextStyleInspector';

interface SelectedTextInspectorProps {
  field: EditableTextField;
  effectiveStyle: TextStyleSettings;
  onTextChange: (value: string) => void;
  onStyleChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void;
  onRemove: () => void;
  onBringToTop: () => void;
  onApplyToAll: () => void;
}

export function SelectedTextInspector({
  field,
  effectiveStyle,
  onTextChange,
  onStyleChange,
  onRemove,
  onBringToTop,
  onApplyToAll,
}: SelectedTextInspectorProps) {
  return (
    <Card className="selected-inspector" size="small">
      <div className="inspector-title-row">
        <Typography.Title level={3}>Selected Text Inspector</Typography.Title>
        <Button danger type="text" onClick={onRemove}>
          remove
        </Button>
      </div>

      <Space direction="vertical" size="middle" className="full-width-stack">
        <label className="field-control inspector-textarea">
          <span>Content</span>
          <Input.TextArea value={field.text} onChange={(event) => onTextChange(event.target.value)} rows={3} />
        </label>

        <TextStyleInspector title="Text Settings" style={effectiveStyle} onChange={onStyleChange} />

        <Button block onClick={onBringToTop}>
          Bring to top layer
        </Button>
        <Button block onClick={onApplyToAll}>
          Apply these settings to ALL text boxes
        </Button>
      </Space>
    </Card>
  );
}
```

**步骤 2：替换 MemeEditor 本地组件**

在 `src/components/MemeEditor.tsx`：

- 删除本地 `SelectedTextInspector` 函数和 props interface。
- 引入：

```ts
import { SelectedTextInspector } from './SelectedTextInspector';
```

**步骤 3：补充 CSS**

在 `src/styles.css` 添加：

```css
.full-width-stack {
  width: 100%;
}
```

**步骤 4：运行构建**

运行：

```powershell
npm run build
```

预期：PASS，MemeEditor 文件明显变短。

---

### 任务 9：实现模板 JSON 生成工具和测试

**文件：**
- 创建：`src/utils/templateConfigurator.ts`
- 创建：`src/utils/templateConfigurator.test.ts`

**步骤 1：编写失败测试**

创建 `src/utils/templateConfigurator.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import type { EditableTextField } from '../types';
import { buildTemplateJson, createConfiguratorTextField, parseTags } from './templateConfigurator';

const field: EditableTextField = {
  id: 'text_1',
  text: 'Text 1',
  placeholder: 'Text 1',
  x: 10.2,
  y: 20.6,
  width: 100.4,
  height: 50.5,
  zIndex: 1,
  styleOverrides: {},
};

describe('template configurator helpers', () => {
  it('parses comma separated tags', () => {
    expect(parseTags('classic, choice, ,fun')).toEqual(['classic', 'choice', 'fun']);
  });

  it('creates centered default text fields', () => {
    expect(createConfiguratorTextField(1, 1000, 500)).toMatchObject({
      id: 'text_1',
      placeholder: 'Text 1',
      width: 600,
      height: 80,
      x: 200,
      y: 210,
    });
  });

  it('builds MemeTemplate-compatible JSON with rounded layout fields', () => {
    expect(buildTemplateJson({ id: 'demo', name: 'Demo', url: '/memes/demo.jpg', tagsInput: 'classic' }, [field])).toEqual({
      id: 'demo',
      name: 'Demo',
      url: '/memes/demo.jpg',
      tags: ['classic'],
      textFields: [
        {
          id: 'text_1',
          placeholder: 'Text 1',
          x: 10,
          y: 21,
          width: 100,
          height: 51,
          fontSize: 36,
          color: '#ffffff',
          align: 'center',
        },
      ],
    });
  });
});
```

**步骤 2：运行测试以验证它失败**

运行：

```powershell
npm run test -- src/utils/templateConfigurator.test.ts
```

预期：FAIL，显示模块或导出不存在。

**步骤 3：实现工具函数**

创建 `src/utils/templateConfigurator.ts`：

```ts
import type { EditableTextField, MemeTemplate } from '../types';
import { roundRect } from './geometry';

export interface TemplateDraft {
  id: string;
  name: string;
  url: string;
  tagsInput: string;
}

export function parseTags(tagsInput: string) {
  return tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function createConfiguratorTextField(index: number, imageWidth: number, imageHeight: number): EditableTextField {
  const width = Math.round(imageWidth * 0.6);
  const height = Math.round(imageHeight * 0.16);

  return {
    id: `text_${index}`,
    text: `Text ${index}`,
    placeholder: `Text ${index}`,
    x: Math.round(imageWidth / 2 - width / 2),
    y: Math.round(imageHeight / 2 - height / 2),
    width,
    height,
    zIndex: index,
    styleOverrides: {},
  };
}

export function buildTemplateJson(draft: TemplateDraft, fields: EditableTextField[]): MemeTemplate {
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    url: draft.url.trim(),
    tags: parseTags(draft.tagsInput),
    textFields: fields.map((field) => {
      const rect = roundRect(field);
      return {
        id: field.id.trim(),
        placeholder: field.placeholder.trim() || field.id.trim(),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontSize: 36,
        color: '#ffffff',
        align: 'center',
      };
    }),
  };
}

export function stringifyTemplateJson(template: MemeTemplate) {
  return `${JSON.stringify(template, null, 2)}\n`;
}
```

**步骤 4：运行测试**

运行：

```powershell
npm run test -- src/utils/templateConfigurator.test.ts src/utils/geometry.test.ts
```

预期：PASS。

---

### 任务 10：实现 TemplateFieldInspector

**文件：**
- 创建：`src/components/TemplateFieldInspector.tsx`

**步骤 1：创建布局 Inspector 组件**

创建 `src/components/TemplateFieldInspector.tsx`：

```tsx
import { Button, Card, Form, Input, InputNumber, Space, Typography } from 'antd';
import type { EditableTextField } from '../types';
import type { Size } from '../utils/geometry';

interface TemplateFieldInspectorProps {
  field: EditableTextField | null;
  imageSize: Size;
  onChange: (fieldId: string, patch: Partial<EditableTextField>) => void;
  onRemove: () => void;
}

export function TemplateFieldInspector({ field, imageSize, onChange, onRemove }: TemplateFieldInspectorProps) {
  if (!field) {
    return <Card size="small">选择或新增一个文本框来编辑布局。</Card>;
  }

  return (
    <Card size="small" className="selected-inspector">
      <div className="inspector-title-row">
        <Typography.Title level={3}>Field Layout</Typography.Title>
        <Button danger type="text" onClick={onRemove}>
          remove
        </Button>
      </div>

      <Form layout="vertical" size="middle">
        <Form.Item label="Field ID">
          <Input value={field.id} onChange={(event) => onChange(field.id, { id: event.target.value })} />
        </Form.Item>
        <Form.Item label="Placeholder">
          <Input value={field.placeholder} onChange={(event) => onChange(field.id, { placeholder: event.target.value, text: event.target.value })} />
        </Form.Item>

        <Space wrap>
          <Form.Item label="X">
            <InputNumber min={0} max={imageSize.width} value={Math.round(field.x)} onChange={(value) => onChange(field.id, { x: value ?? 0 })} />
          </Form.Item>
          <Form.Item label="Y">
            <InputNumber min={0} max={imageSize.height} value={Math.round(field.y)} onChange={(value) => onChange(field.id, { y: value ?? 0 })} />
          </Form.Item>
          <Form.Item label="Width">
            <InputNumber min={1} max={imageSize.width} value={Math.round(field.width)} onChange={(value) => onChange(field.id, { width: value ?? 1 })} />
          </Form.Item>
          <Form.Item label="Height">
            <InputNumber min={1} max={imageSize.height} value={Math.round(field.height)} onChange={(value) => onChange(field.id, { height: value ?? 1 })} />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
}
```

**步骤 2：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。

**注意：** 后续在父组件中处理改 ID 后的 `selectedFieldId` 同步；此组件只发 patch。

---

### 任务 11：实现 TemplateConfigurator 组件骨架和上传

**文件：**
- 创建：`src/components/TemplateConfigurator.tsx`
- 修改：`src/styles.css`

**步骤 1：创建组件骨架**

创建 `src/components/TemplateConfigurator.tsx`，先实现模板表单、上传和 object URL 生命周期：

```tsx
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { EditableTextField } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import { buildTemplateJson, stringifyTemplateJson } from '../utils/templateConfigurator';

interface TemplateConfiguratorProps {
  onBack: () => void;
}

interface DraftState {
  id: string;
  name: string;
  url: string;
  tagsInput: string;
}

const initialDraft: DraftState = {
  id: '',
  name: '',
  url: '',
  tagsInput: '',
};

export function TemplateConfigurator({ onBack }: TemplateConfiguratorProps) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [imageUrl, setImageUrl] = useState('');
  const [fields, setFields] = useState<EditableTextField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(imageUrl);
  const [api, contextHolder] = message.useMessage();

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const templateJson = useMemo(() => buildTemplateJson(draft, fields), [draft, fields]);
  const jsonText = useMemo(() => stringifyTemplateJson(templateJson), [templateJson]);

  const uploadProps: UploadProps = {
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      if (!file.type.startsWith('image/')) {
        api.error('请选择图片文件。');
        return Upload.LIST_IGNORE;
      }

      setImageUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(file);
      });
      setFields([]);
      setSelectedFieldId('');
      api.info('Image changed, text boxes reset.');
      return false;
    },
  };

  return (
    <section className="editor-layout" aria-label="Create template">
      {contextHolder}
      <div className="editor-toolbar">
        <Button onClick={onBack}>← 返回模板</Button>
        <div>
          <Typography.Title level={2}>Create template</Typography.Title>
          <Typography.Paragraph>上传本地图片预览，标注文本区域，并复制生成的 JSON。</Typography.Paragraph>
        </div>
      </div>

      <div className="editor-grid configurator-grid">
        <Card className="preview-panel">
          {!imageUrl ? (
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag image to this area</p>
              <p className="ant-upload-hint">图片只在浏览器内存中用于预览，不会上传。</p>
            </Upload.Dragger>
          ) : (
            <div>TODO preview</div>
          )}
        </Card>

        <aside className="control-panel inspector-panel panel">
          <Card size="small" title="Template Info">
            <Form layout="vertical">
              <Form.Item label="Template ID"><Input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} /></Form.Item>
              <Form.Item label="Name"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Form.Item>
              <Form.Item label="Image URL"><Input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="/memes/my-template.jpg" /></Form.Item>
              <Form.Item label="Tags"><Input value={draft.tagsInput} onChange={(event) => setDraft({ ...draft, tagsInput: event.target.value })} placeholder="classic, choice" /></Form.Item>
            </Form>
          </Card>

          <Alert type="info" showIcon message="MVP only generates JSON. Put the image file under public/memes separately." />

          <Card size="small" title="Generated JSON">
            <pre className="json-preview">{jsonText}</pre>
          </Card>
        </aside>
      </div>
    </section>
  );
}
```

**步骤 2：安装图标包（如果未被 antd 自动包含）**

若构建提示 `@ant-design/icons` 不存在，运行：

```powershell
npm install @ant-design/icons
```

**步骤 3：添加 JSON 预览样式**

在 `src/styles.css` 添加：

```css
.configurator-grid .ant-card {
  border-radius: 16px;
}

.json-preview {
  max-height: 320px;
  margin: 0;
  overflow: auto;
  border-radius: 12px;
  padding: 12px;
  color: var(--color-text);
  background: var(--color-surface-muted);
  font-size: 0.85rem;
  white-space: pre-wrap;
}
```

**步骤 4：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。

---

### 任务 12：将 TemplateConfigurator 接入 `/create`

**文件：**
- 修改：`src/App.tsx`

**步骤 1：接入简单路径状态**

修改 `src/App.tsx`：

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Gallery } from './components/Gallery';
import { MemeEditor } from './components/MemeEditor';
import { TemplateConfigurator } from './components/TemplateConfigurator';
import { memeTemplates } from './memes';
import type { MemeTemplate } from './types';

function getInitialView() {
  return window.location.pathname.endsWith('/create') ? 'create' : 'gallery';
}

function App() {
  const [view, setView] = useState<'gallery' | 'create'>(() => getInitialView());
  const [selectedTemplate, setSelectedTemplate] = useState<MemeTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
      setSelectedTemplate(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openCreate = () => {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}/create`);
    setSelectedTemplate(null);
    setView('create');
  };

  const goHome = () => {
    window.history.pushState({}, '', import.meta.env.BASE_URL || '/');
    setSelectedTemplate(null);
    setView('gallery');
  };

  // keep existing filteredTemplates logic
```

在 JSX 中：

- Hero 内增加按钮：

```tsx
<button className="secondary-button" type="button" onClick={openCreate}>
  Create template
</button>
```

- 主内容条件改为：

```tsx
{view === 'create' ? (
  <TemplateConfigurator onBack={goHome} />
) : selectedTemplate ? (
  <MemeEditor template={selectedTemplate} onBack={() => setSelectedTemplate(null)} />
) : (
  <Gallery ... />
)}
```

**步骤 2：验证 GitHub Pages base path**

运行：

```powershell
npm run build:pages
```

预期：PASS。注意 `/open-meme/create` 的静态刷新是否 404 属于部署服务器 fallback 问题，MVP 只保证客户端内跳转可用。

---

### 任务 13：在 TemplateConfigurator 中加入共享预览、添加/删除/编辑字段

**文件：**
- 修改：`src/components/TemplateConfigurator.tsx`
- 使用：`src/components/TextFieldsPreview.tsx`
- 使用：`src/components/TemplateFieldInspector.tsx`
- 使用：`src/utils/templateConfigurator.ts`
- 使用：`src/utils/geometry.ts`

**步骤 1：引入共享组件和工具**

在 `TemplateConfigurator.tsx` 加入：

```ts
import { TemplateFieldInspector } from './TemplateFieldInspector';
import { TextFieldsPreview } from './TextFieldsPreview';
import { clampBoxToImage } from '../utils/geometry';
import { createConfiguratorTextField } from '../utils/templateConfigurator';
```

**步骤 2：实现字段更新 helper**

在组件内加入：

```ts
const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;

const updateField = (fieldId: string, patch: Partial<EditableTextField>) => {
  setFields((current) =>
    current.map((field) => {
      if (field.id !== fieldId) {
        return field;
      }

      const next = { ...field, ...patch };
      const clamped = clampBoxToImage(
        { x: next.x, y: next.y, width: next.width, height: next.height },
        imageSize,
        { minWidth: 1, minHeight: 1 },
      );
      return { ...next, ...clamped };
    }),
  );

  if (patch.id && patch.id !== fieldId) {
    setSelectedFieldId(patch.id);
  }
};

const addTextField = () => {
  const nextIndex = fields.length + 1;
  const field = createConfiguratorTextField(nextIndex, imageSize.width, imageSize.height);
  setFields((current) => [...current, field]);
  setSelectedFieldId(field.id);
};

const removeSelectedField = () => {
  if (!selectedField) {
    return;
  }

  const remaining = fields.filter((field) => field.id !== selectedField.id);
  setFields(remaining);
  setSelectedFieldId(remaining[0]?.id ?? '');
};
```

**步骤 3：替换 TODO preview**

将 `TODO preview` 替换为：

```tsx
<Space direction="vertical" size="middle" className="full-width-stack">
  <div className="preview-actions">
    <Upload {...uploadProps}>
      <Button>Replace image</Button>
    </Upload>
    <Button type="primary" onClick={addTextField} disabled={!imageUrl}>
      + Add text box
    </Button>
  </div>

  <TextFieldsPreview
    imageRef={imageRef}
    imageUrl={imageUrl}
    imageAlt={draft.name || 'Template preview'}
    fields={fields}
    selectedFieldId={selectedFieldId}
    imageSize={imageSize}
    previewScale={previewScale}
    boxClassName="creator-text-box"
    onImageLoad={updatePreviewScale}
    onSelectField={setSelectedFieldId}
    onFieldRectChange={(fieldId, rect) => updateField(fieldId, rect)}
    renderField={(field) => <div className="creator-placeholder">{field.placeholder}</div>}
  />
</Space>
```

**步骤 4：加入 TemplateFieldInspector**

在右侧 Template Info 后加入：

```tsx
<TemplateFieldInspector field={selectedField} imageSize={imageSize} onChange={updateField} onRemove={removeSelectedField} />
```

**步骤 5：添加创建器文本框样式**

在 `src/styles.css` 添加：

```css
.creator-text-box {
  border: 2px dashed var(--color-primary);
  border-radius: 8px;
  cursor: move;
  background: var(--color-focus-ring);
}

.creator-text-box.is-selected {
  border-style: solid;
  box-shadow: 0 0 0 2px var(--color-selection-ring);
}

.creator-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  padding: 4px;
  color: var(--color-primary-strong);
  font-weight: 800;
  pointer-events: none;
  text-align: center;
}
```

**步骤 6：运行构建**

运行：

```powershell
npm run build
```

预期：PASS。

---

### 任务 14：加入 JSON 提示和 Copy JSON

**文件：**
- 修改：`src/components/TemplateConfigurator.tsx`

**步骤 1：生成非阻塞提示**

在组件内加入：

```ts
const warnings = [
  !draft.id.trim() ? 'Template ID is missing.' : '',
  !draft.name.trim() ? 'Name is missing.' : '',
  !draft.url.trim() ? 'Image URL is missing.' : '',
  !imageUrl ? 'Upload an image to place text boxes.' : '',
  fields.length === 0 ? 'Add at least one text box.' : '',
].filter(Boolean);
```

**步骤 2：实现复制**

在组件内加入：

```ts
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(jsonText);
    api.success('JSON copied to clipboard.');
  } catch {
    api.error('Clipboard is unavailable. Please copy the JSON manually.');
  }
};
```

**步骤 3：在右侧显示提示和按钮**

在 Generated JSON Card 前加入：

```tsx
{warnings.length > 0 && <Alert type="warning" showIcon message="Template is incomplete" description={warnings.join(' ')} />}
```

将 Generated JSON Card title 改为带按钮：

```tsx
<Card
  size="small"
  title="Generated JSON"
  extra={<Button onClick={copyJson}>Copy JSON</Button>}
>
  <pre className="json-preview">{jsonText}</pre>
</Card>
```

**步骤 4：运行构建和测试**

运行：

```powershell
npm run test
npm run build
```

预期：全部 PASS。

---

### 任务 15：细化 AntD theme 与样式兼容

**文件：**
- 修改：`src/App.tsx`
- 修改：`src/styles.css`

**步骤 1：使用 ConfigProvider 包裹应用内容**

在 `src/App.tsx` 引入：

```ts
import { ConfigProvider } from 'antd';
```

用 `ConfigProvider` 包裹原 `<main>`：

```tsx
return (
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#4263eb',
        borderRadius: 14,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
    }}
  >
    <main className="app-shell">...</main>
  </ConfigProvider>
);
```

**步骤 2：检查 CSS 冲突**

确认 `src/styles.css` 中全局 `button`、`input`、`select`、`textarea` 规则不会破坏 AntD：

```css
button,
input,
select,
textarea {
  font: inherit;
}
```

这条可以保留。不要给所有 `button` 加背景、边框等全局样式。

**步骤 3：运行构建**

运行：

```powershell
npm run build
npm run build:pages
```

预期：全部 PASS。

---

### 任务 16：人工验证现有 MemeEditor 回归

**文件：**
- 无代码改动

**步骤 1：启动开发服务器**

运行：

```powershell
npm run dev
```

预期：Vite 输出本地访问地址，例如 `http://localhost:5173/`。

**步骤 2：验证 MemeEditor**

手动操作：

1. 首页选择 `Choice Road` 或 `Two Buttons`。
2. 点击任意文本框，确认右侧仍是 Selected Text Inspector。
3. 修改 Content、Font Color、Outline Color、Effect、Font Size、Max Font Size、Text Align、Vertical Align、Opacity。
4. 拖拽/缩放文本框，确认预览位置正确且没有横向滚动。
5. 点击 `Apply these settings to ALL text boxes`，确认现有文本框样式一致。
6. 点击 `+ Add text box`，确认新文本框仍使用默认白字黑描边。
7. 下载 PNG 和复制图片，确认成功消息正常。

预期：行为与重构前一致。

---

### 任务 17：人工验证 `/create` MVP

**文件：**
- 无代码改动

**步骤 1：访问 `/create`**

在开发服务器中打开：

```text
http://localhost:5173/create
```

或从首页点击 `Create template`。

预期：进入 Create template 页面，能返回首页。

**步骤 2：上传图片并添加文本框**

手动操作：

1. 拖入或选择一张图片。
2. 点击 `+ Add text box`。
3. 拖拽/缩放文本框。
4. 在 Field Layout 中修改 `Field ID`、`Placeholder`、`X/Y/Width/Height`。
5. 删除文本框。
6. 更换图片，确认文本框重置并显示提示。

预期：预览层与 Inspector 双向同步；坐标不超出图片边界。

**步骤 3：验证 JSON**

手动操作：

1. 填写 Template ID、Name、Image URL、Tags。
2. 添加至少一个文本框。
3. 查看 Generated JSON。
4. 点击 Copy JSON。

预期：JSON 格式为 `id/name/url/tags/textFields`；每个字段包含 `id/placeholder/x/y/width/height/fontSize/color/align`；坐标为整数；复制成功显示 message。

---

### 任务 18：最终验证与整理

**文件：**
- 可能修改：`src/styles.css`（仅修复人工验证发现的小样式问题）

**步骤 1：运行完整验证命令**

运行：

```powershell
npm run test
npm run build
npm run build:pages
```

预期：全部 PASS。

**步骤 2：检查工作区改动**

运行：

```powershell
git status --short
```

预期：只包含本计划预期文件中的修改和新增；不要出现无关文件。

**步骤 3：检查 MemeEditor 体积和重复逻辑**

人工检查：

- `src/components/MemeEditor.tsx` 中不再直接 import `Rnd`。
- `src/components/MemeEditor.tsx` 中不再有本地 ResizeObserver 逻辑。
- `/create` 不重复实现 `previewScale + react-rnd + 坐标换算`。
- AntD 使用集中在 `/create`、Inspector 和表单/反馈控件。

预期：满足 DRY，MemeEditor 明显比原来更聚焦。

---

## 审查范围

详见：`.docs/plans/2026-06-11-create-configurator-mvp-review-scope.md`
