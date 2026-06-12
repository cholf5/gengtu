import { Button, Card, Form, Input, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
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
    <Card
      size="small"
      title={<Typography.Text strong>Selected Text Inspector</Typography.Text>}
      extra={
        <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove}>
          remove
        </Button>
      }
    >
      <Space direction="vertical" size="middle" className="full-width-stack">
        <Form layout="vertical" size="middle">
          <Form.Item label="Content">
            <Input.TextArea value={field.text} onChange={(event) => onTextChange(event.target.value)} rows={3} />
          </Form.Item>
        </Form>

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
