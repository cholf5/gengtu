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
