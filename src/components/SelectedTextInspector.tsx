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
