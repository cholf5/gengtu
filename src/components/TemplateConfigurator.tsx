import { ArrowLeftOutlined, CopyOutlined, DownloadOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { EditableTextField } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import { clampBoxToImage } from '../utils/geometry';
import {
  buildTemplateJson,
  createConfiguratorTextField,
  deriveTemplateDraftFromFilename,
  deriveTemplateDraftFromName,
  duplicateTextField,
  extractFileExtension,
  getNextTextFieldIndex,
  stringifyTemplateJson,
} from '../utils/templateConfigurator';
import { TemplateFieldInspector } from './TemplateFieldInspector';
import { TextFieldsPreview } from './TextFieldsPreview';

interface TemplateConfiguratorProps {
  onBack: () => void;
}

interface DraftState {
  name: string;
  tagsInput: string;
  /** Extension carried over from the uploaded file so url stays in sync when name changes. */
  imageExt: string;
}

const initialDraft: DraftState = {
  name: '',
  tagsInput: '',
  imageExt: '',
};

export function TemplateConfigurator({ onBack }: TemplateConfiguratorProps) {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [imageUrl, setImageUrl] = useState('');
  const [fields, setFields] = useState<EditableTextField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(imageUrl);
  const [api, contextHolder] = message.useMessage();

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const derived = useMemo(() => deriveTemplateDraftFromName(draft.name, draft.imageExt), [draft.name, draft.imageExt]);
  const templateJson = useMemo(
    () => buildTemplateJson({ id: derived.id, name: derived.name, url: derived.url, tagsInput: draft.tagsInput }, fields),
    [derived, draft.tagsInput, fields],
  );
  const jsonText = useMemo(() => stringifyTemplateJson(templateJson), [templateJson]);
  const warnings = [
    !draft.name.trim() ? 'Name is missing.' : '',
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

      const fromFile = deriveTemplateDraftFromFilename(file.name);
      const ext = extractFileExtension(file.name);
      setDraft((current) => ({
        ...current,
        name: fromFile.name || current.name,
        imageExt: ext,
      }));

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

  const duplicateSelectedField = () => {
    if (!selectedField) {
      return;
    }

    const copy = duplicateTextField(selectedField, fields, imageSize);
    setFields((current) => [...current, copy]);
    setSelectedFieldId(copy.id);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      api.success('JSON copied to clipboard.');
    } catch {
      api.error('Clipboard is unavailable. Please copy the JSON manually.');
    }
  };

  const downloadJson = () => {
    const slug = derived.id.toLowerCase();
    if (!slug) {
      api.error('Set a Name before downloading.');
      return;
    }

    const blob = new Blob([jsonText], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${slug}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
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
            <Form
              layout="horizontal"
              size="small"
              colon={false}
              labelCol={{ flex: '104px' }}
              wrapperCol={{ flex: 1 }}
              labelAlign="left"
            >
              <Form.Item label="Name" style={{ marginBottom: 8 }}>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Distracted Boyfriend"
                />
              </Form.Item>
              <Form.Item label="Template ID" tooltip="Auto-generated from Name" style={{ marginBottom: 8 }}>
                <Input value={derived.id} disabled placeholder="Distracted-Boyfriend" />
              </Form.Item>
              <Form.Item label="Image URL" tooltip="Auto-generated from Name and uploaded image" style={{ marginBottom: 8 }}>
                <Input value={derived.url} disabled placeholder="/memes/distracted-boyfriend.jpg" />
              </Form.Item>
              <Form.Item label="Tags" style={{ marginBottom: 0 }}>
                <Input
                  value={draft.tagsInput}
                  onChange={(event) => setDraft({ ...draft, tagsInput: event.target.value })}
                  placeholder="classic, choice"
                />
              </Form.Item>
            </Form>
          </Card>

          <TemplateFieldInspector
            field={selectedField}
            imageSize={imageSize}
            onChange={updateField}
            onRemove={removeSelectedField}
            onDuplicate={duplicateSelectedField}
          />

          <Alert type="info" showIcon message="MVP only generates JSON. Put the image file under public/memes separately." />

          {warnings.length > 0 && <Alert type="warning" showIcon message="Template is incomplete" description={warnings.join(' ')} />}

          <Card
            size="small"
            title="Generated JSON"
            extra={
              <Space size="small">
                <Button icon={<CopyOutlined />} onClick={copyJson}>
                  Copy
                </Button>
                <Button icon={<DownloadOutlined />} onClick={downloadJson} disabled={!derived.id}>
                  Download
                </Button>
              </Space>
            }
          >
            <pre className="json-preview">{jsonText}</pre>
          </Card>
        </aside>
      </div>
    </section>
  );
}
