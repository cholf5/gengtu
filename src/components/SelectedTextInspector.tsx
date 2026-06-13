import { Button, Card, Col, Form, Input, InputNumber, Row, Slider, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { EditableTextField, TextStyleSettings } from '../types';
import { TextStyleInspector } from './TextStyleInspector';

interface SelectedTextInspectorProps {
  field: EditableTextField;
  effectiveStyle: TextStyleSettings;
  onTextChange: (value: string) => void;
  onRotationChange: (value: number) => void;
  onStyleChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void;
  onRemove: () => void;
  onBringToTop: () => void;
  onApplyToAll: () => void;
}

export function SelectedTextInspector({
  field,
  effectiveStyle,
  onTextChange,
  onRotationChange,
  onStyleChange,
  onRemove,
  onBringToTop,
  onApplyToAll,
}: SelectedTextInspectorProps) {
  return (
    <Card
      size="small"
      title={<Typography.Text strong>Text Inspector</Typography.Text>}
      extra={
        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove}>
          remove
        </Button>
      }
    >
      <Space direction="vertical" size={10} className="full-width-stack">
        <Input.TextArea
          value={field.text}
          onChange={(event) => onTextChange(event.target.value)}
          autoSize={{ minRows: 2, maxRows: 5 }}
          placeholder="Content"
        />

        <Form layout="horizontal" size="small" colon={false} labelAlign="left" style={{ marginBottom: 0 }}>
          <Form.Item label="Rotation" labelCol={{ flex: '70px' }} style={{ marginBottom: 0 }}>
            <Row gutter={8} align="middle" wrap={false}>
              <Col flex="auto">
                <Slider
                  min={-180}
                  max={180}
                  step={1}
                  value={field.rotation}
                  onChange={(value) => onRotationChange(typeof value === 'number' ? value : field.rotation)}
                  tooltip={{ formatter: (value) => `${value}°` }}
                />
              </Col>
              <Col flex="84px">
                <InputNumber
                  min={-360}
                  max={360}
                  step={1}
                  value={Math.round(field.rotation)}
                  onChange={(value) => onRotationChange(typeof value === 'number' ? value : 0)}
                  formatter={(value) => `${value}°`}
                  parser={(value) => Number((value ?? '').toString().replace(/[^\d-]/g, '')) || 0}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </Form.Item>
        </Form>

        <TextStyleInspector title="Text Settings" style={effectiveStyle} onChange={onStyleChange} />

        <Space.Compact block>
          <Button size="small" onClick={onBringToTop} style={{ flex: 1 }}>
            Bring to top
          </Button>
          <Button size="small" onClick={onApplyToAll} style={{ flex: 1 }}>
            Apply to all
          </Button>
        </Space.Compact>
      </Space>
    </Card>
  );
}
