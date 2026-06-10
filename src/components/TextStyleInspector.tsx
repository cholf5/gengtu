import { Checkbox, ColorPicker, Form, InputNumber, Radio, Select, Slider, Space, Typography } from 'antd';
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

function toHex(value: string | { toHexString: () => string }) {
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
