import { Button, Card, Form, Input, InputNumber, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
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
    <Card
      size="small"
      title={<Typography.Text strong>Field Layout</Typography.Text>}
      extra={
        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove}>
          remove
        </Button>
      }
    >
      <Form layout="vertical" size="middle">
        <Form.Item label="Field ID">
          <Input value={field.id} onChange={(event) => onChange(field.id, { id: event.target.value })} />
        </Form.Item>
        <Form.Item label="Placeholder">
          <Input
            value={field.placeholder}
            onChange={(event) => onChange(field.id, { placeholder: event.target.value, text: event.target.value })}
          />
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
