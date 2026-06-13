import { Card, Checkbox, ColorPicker, Form, InputNumber, Radio, Row, Col, Select, Slider, Space } from 'antd';
import type { TextAlign, TextEffect, TextStyleSettings, VerticalAlign } from '../types';

const FONT_OPTIONS = ['Impact', 'Arial Black', 'Arial', 'Verdana', 'Comic Sans MS', 'system-ui'];
const EFFECT_OPTIONS: TextEffect[] = ['outline', 'shadow', 'glow', 'none'];
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

const COMPACT_ITEM_STYLE = { marginBottom: 8 };

export function TextStyleInspector({ title, style, onChange }: TextStyleInspectorProps) {
  return (
    <Card size="small" type="inner" title={title} className="compact-inspector">
      <Form
        layout="horizontal"
        size="small"
        colon={false}
        labelCol={{ flex: '104px' }}
        wrapperCol={{ flex: 1 }}
        labelAlign="left"
      >
        <Form.Item label="Font" style={COMPACT_ITEM_STYLE}>
          <Select
            value={style.fontFamily}
            options={FONT_OPTIONS.map((font) => ({ value: font, label: font }))}
            onChange={(value) => onChange('fontFamily', value)}
          />
        </Form.Item>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item label="Font Color" labelCol={{ flex: '78px' }} style={COMPACT_ITEM_STYLE}>
              <ColorPicker
                value={style.fontColor}
                size="small"
                onChangeComplete={(color) => onChange('fontColor', toHex(color))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Outline" labelCol={{ flex: '60px' }} style={COMPACT_ITEM_STYLE}>
              <ColorPicker
                value={style.outlineColor}
                size="small"
                onChangeComplete={(color) => onChange('outlineColor', toHex(color))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Style" style={COMPACT_ITEM_STYLE}>
          <Space size={12} wrap>
            <Checkbox checked={style.uppercase} onChange={(event) => onChange('uppercase', event.target.checked)}>
              CAPS
            </Checkbox>
            <Checkbox checked={style.bold} onChange={(event) => onChange('bold', event.target.checked)}>
              Bold
            </Checkbox>
            <Checkbox checked={style.italic} onChange={(event) => onChange('italic', event.target.checked)}>
              Italic
            </Checkbox>
          </Space>
        </Form.Item>

        <Form.Item label="Effect" style={COMPACT_ITEM_STYLE}>
          <Radio.Group
            value={style.effect}
            size="small"
            onChange={(event) => onChange('effect', event.target.value)}
          >
            {EFFECT_OPTIONS.map((effect) => (
              <Radio.Button key={effect} value={effect}>
                {effect}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item label="Size" labelCol={{ flex: '52px' }} style={COMPACT_ITEM_STYLE}>
              <InputNumber
                min={12}
                max={160}
                value={style.fontSize}
                onChange={(value) => onChange('fontSize', value ?? style.fontSize)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Max" labelCol={{ flex: '52px' }} style={COMPACT_ITEM_STYLE}>
              <InputNumber
                min={12}
                max={180}
                value={style.maxFontSize}
                onChange={(value) => onChange('maxFontSize', value ?? style.maxFontSize)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Outline Width" style={COMPACT_ITEM_STYLE}>
          <InputNumber
            min={0}
            max={24}
            value={style.outlineWidth}
            onChange={(value) => onChange('outlineWidth', value ?? style.outlineWidth)}
          />
        </Form.Item>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item label="Align" labelCol={{ flex: '52px' }} style={COMPACT_ITEM_STYLE}>
              <Select
                value={style.textAlign}
                options={TEXT_ALIGN_OPTIONS.map((align) => ({ value: align, label: align }))}
                onChange={(value) => onChange('textAlign', value)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="V-Align" labelCol={{ flex: '60px' }} style={COMPACT_ITEM_STYLE}>
              <Select
                value={style.verticalAlign}
                options={VERTICAL_ALIGN_OPTIONS.map((align) => ({ value: align, label: align }))}
                onChange={(value) => onChange('verticalAlign', value)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label={`Opacity ${style.opacity.toFixed(2)}`} style={{ ...COMPACT_ITEM_STYLE, marginBottom: 0 }}>
          <Slider min={0} max={1} step={0.05} value={style.opacity} onChange={(value) => onChange('opacity', value)} />
        </Form.Item>
      </Form>
    </Card>
  );
}
