import { ArrowLeftOutlined, CopyOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { EditableTextField } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import { clampBoxToImage } from '../utils/geometry';
import {
  buildTemplateJson,
  createConfiguratorTextField,
  getNextTextFieldIndex,
  stringifyTemplateJson,
} from '../utils/templateConfigurator';
import { TemplateFieldInspector } from './TemplateFieldInspector';
import { TextFieldsPreview } from './TextFieldsPreview';

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

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const templateJson = useMemo(() => buildTemplateJson(draft, fields), [draft, fields]);
  const jsonText = useMemo(() => stringifyTemplateJson(templateJson), [templateJson]);
  const warnings = [
    !draft.id.trim() ? 'Template ID is missing.' : '',
    !draft.name.trim() ? 'Name is missing.' : '',
    !draft.url.trim() ? 'Image URL is missing.' : '',
    !imageUrl ? 'Upload an image to place text boxes.' : '',
    fields.length === 0 ? 'Add at least one text box.' : '',
  ].filter(Boolean);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

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

  const updateField = (fieldId: string, patch: Partial<EditableTextField>) => {
    if (patch.id !== undefined) {
      const nextId = patch.id.trim();
      if (!nextId) {
        return;
      }

      if (nextId !== fieldId && fields.some((field) => field.id === nextId)) {
        api.error('Field ID must be unique.');
        return;
      }

      patch = { ...patch, id: nextId };
    }

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
    const nextIndex = getNextTextFieldIndex(fields);
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

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      api.success('JSON copied to clipboard.');
    } catch {
      api.error('Clipboard is unavailable. Please copy the JSON manually.');
    }
  };

  return (
    <section className="editor-layout" aria-label="Create template">
      {contextHolder}
      <div className="editor-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回模板
        </Button>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Create template
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            上传本地图片预览，标注文本区域，并复制生成的 JSON。
          </Typography.Paragraph>
        </div>
      </div>

      <div className="editor-grid configurator-grid">
        <Card className="preview-panel">
          {!imageUrl ? (
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag image to this area</p>
              <p className="ant-upload-hint">图片只在浏览器内存中用于预览，不会上传。</p>
            </Upload.Dragger>
          ) : (
            <Space direction="vertical" size="middle" className="full-width-stack">
              <div className="preview-actions">
                <Upload {...uploadProps}>
                  <Button>Replace image</Button>
                </Upload>
                <Button type="primary" icon={<PlusOutlined />} onClick={addTextField} disabled={!imageUrl}>
                  Add text box
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
          )}
        </Card>

        <aside className="control-panel inspector-panel">
          <Card size="small" title="Template Info">
            <Form layout="vertical">
              <Form.Item label="Template ID">
                <Input value={draft.id} onChange={(event) => setDraft({ ...draft, id: event.target.value })} />
              </Form.Item>
              <Form.Item label="Name">
                <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Form.Item>
              <Form.Item label="Image URL">
                <Input
                  value={draft.url}
                  onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                  placeholder="/memes/my-template.jpg"
                />
              </Form.Item>
              <Form.Item label="Tags">
                <Input
                  value={draft.tagsInput}
                  onChange={(event) => setDraft({ ...draft, tagsInput: event.target.value })}
                  placeholder="classic, choice"
                />
              </Form.Item>
            </Form>
          </Card>

          <TemplateFieldInspector field={selectedField} imageSize={imageSize} onChange={updateField} onRemove={removeSelectedField} />

          <Alert type="info" showIcon message="MVP only generates JSON. Put the image file under public/memes separately." />

          {warnings.length > 0 && <Alert type="warning" showIcon message="Template is incomplete" description={warnings.join(' ')} />}

          <Card size="small" title="Generated JSON" extra={<Button icon={<CopyOutlined />} onClick={copyJson}>Copy JSON</Button>}>
            <pre className="json-preview">{jsonText}</pre>
          </Card>
        </aside>
      </div>
    </section>
  );
}
