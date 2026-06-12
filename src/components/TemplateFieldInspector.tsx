import { Button, Card, Col, Form, Input, InputNumber, Row, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { EditableTextField } from '../types';
import type { Size } from '../utils/geometry';

interface TemplateFieldInspectorProps {
  field: EditableTextField | null;
  imageSize: Size;
  onChange: (fieldId: string, patch: Partial<EditableTextField>) => void;
  onRemove: () => void;
}

const COMPACT_ITEM_STYLE = { marginBottom: 8 };

export function TemplateFieldInspector({ field, imageSize, onChange, onRemove }: TemplateFieldInspectorProps) {
  if (!field) {
    return <Card size="small">选择或新增一个文本框来编辑布局。</Card>;
  }

  return (
    <Card
      size="small"
      title={<Typography.Text strong>Field Layout</Typography.Text>}
      extra={
        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove}>
          remove
        </Button>
      }
    >
      <Form
        layout="horizontal"
        size="small"
        colon={false}
        labelCol={{ flex: '92px' }}
        wrapperCol={{ flex: 1 }}
        labelAlign="left"
      >
        <Form.Item label="Field ID" style={COMPACT_ITEM_STYLE}>
          <Input value={field.id} onChange={(event) => onChange(field.id, { id: event.target.value })} />
        </Form.Item>
        <Form.Item label="Placeholder" style={COMPACT_ITEM_STYLE}>
          <Input
            value={field.placeholder}
            onChange={(event) => onChange(field.id, { placeholder: event.target.value, text: event.target.value })}
          />
        </Form.Item>

        <Row gutter={8}>
          <Col span={12}>
            <Form.Item label="X" labelCol={{ flex: '40px' }} style={COMPACT_ITEM_STYLE}>
              <InputNumber
                min={0}
                max={imageSize.width}
                value={Math.round(field.x)}
                onChange={(value) => onChange(field.id, { x: value ?? 0 })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Y" labelCol={{ flex: '40px' }} style={COMPACT_ITEM_STYLE}>
              <InputNumber
                min={0}
                max={imageSize.height}
                value={Math.round(field.y)}
                onChange={(value) => onChange(field.id, { y: value ?? 0 })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="W" labelCol={{ flex: '40px' }} style={{ ...COMPACT_ITEM_STYLE, marginBottom: 0 }}>
              <InputNumber
                min={1}
                max={imageSize.width}
                value={Math.round(field.width)}
                onChange={(value) => onChange(field.id, { width: value ?? 1 })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="H" labelCol={{ flex: '40px' }} style={{ ...COMPACT_ITEM_STYLE, marginBottom: 0 }}>
              <InputNumber
                min={1}
                max={imageSize.height}
                value={Math.round(field.height)}
                onChange={(value) => onChange(field.id, { height: value ?? 1 })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
