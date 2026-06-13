import { ArrowLeftOutlined, CopyOutlined, DownloadOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Switch, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditableTextField, MemeThumbnailCrop, TextStyleSettings } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import {
  clampBoxToImage,
  clampCropTo43,
  cropToNormalized,
  maxCenteredCropTo43,
  normalizedToCrop,
  type Rect,
} from '../utils/geometry';
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
import { buildImportedDraft, parseTemplateJson, resolveTemplateImageUrl } from '../utils/templateImport';
import { DEFAULT_TEXT_STYLE, getPreviewText, getPreviewTextStyle, getVerticalAlignClass, resolveTextStyle } from '../utils/textStyles';
import { TemplateFieldInspector } from './TemplateFieldInspector';
import { TextFieldsPreview } from './TextFieldsPreview';
import { ThumbnailCropOverlay } from './ThumbnailCropOverlay';

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
  const [cropEnabled, setCropEnabled] = useState(false);
  // Crop rect is stored in NATURAL image pixels, mirroring how text boxes are
  // tracked. Normalization to 0..1 happens only when serializing to JSON.
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  // Off by default — the dimmed shading helps preview the gallery card but
  // gets in the way when adding text boxes outside the crop.
  const [cropShading, setCropShading] = useState(false);
  // Set when the user imports an existing template JSON. Two pieces of state:
  //   - importedHint: shown in the subtitle so the user knows they're editing.
  //   - pendingThumbnail: a normalized 0..1 crop deferred until imageSize is
  //     known; the effect below converts it to natural pixels via normalizedToCrop.
  // missingImageUrl carries the original `template.url` when the auto-fetch
  // fails, so we can prompt the user to upload the image manually.
  const [importedHint, setImportedHint] = useState<string | null>(null);
  const [pendingThumbnail, setPendingThumbnail] = useState<MemeThumbnailCrop | null>(null);
  const [missingImageUrl, setMissingImageUrl] = useState<string | null>(null);
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(imageUrl);
  const [api, contextHolder] = message.useMessage();
  // Tracks blob: URLs we created so we revoke them on replace / unmount,
  // without revoking external URLs (when fetch fallback isn't used).
  const blobUrlRef = useRef<string | null>(null);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const selectedEffectiveStyle = selectedField ? resolveTextStyle(selectedField) : DEFAULT_TEXT_STYLE;
  const derived = useMemo(() => deriveTemplateDraftFromName(draft.name, draft.imageExt), [draft.name, draft.imageExt]);
  const thumbnailCrop = useMemo<MemeThumbnailCrop | undefined>(() => {
    if (!cropEnabled || !cropRect || imageSize.width <= 0 || imageSize.height <= 0) {
      return undefined;
    }
    return cropToNormalized(cropRect, imageSize);
  }, [cropEnabled, cropRect, imageSize]);
  const templateJson = useMemo(
    () =>
      buildTemplateJson(
        { id: derived.id, name: derived.name, url: derived.url, tagsInput: draft.tagsInput },
        fields,
        thumbnailCrop,
      ),
    [derived, draft.tagsInput, fields, thumbnailCrop],
  );
  const jsonText = useMemo(() => stringifyTemplateJson(templateJson), [templateJson]);
  const warnings = [
    !draft.name.trim() ? 'Name is missing.' : '',
    !imageUrl ? 'Upload an image to place text boxes.' : '',
    fields.length === 0 ? 'Add at least one text box.' : '',
  ].filter(Boolean);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  /**
   * Replace the preview image, revoking the previous blob URL when one was
   * created via createObjectURL. Pass `null` to clear the preview.
   */
  const setPreviewImage = (nextUrl: string | null, opts: { isBlob: boolean }) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (nextUrl && opts.isBlob) {
      blobUrlRef.current = nextUrl;
    }
    setImageUrl(nextUrl ?? '');
  };

  /** Fetch the image referenced by `templateUrl` and turn it into a blob: URL. */
  const fetchTemplateImage = async (templateUrl: string): Promise<string | null> => {
    const resolved = resolveTemplateImageUrl(templateUrl, import.meta.env.BASE_URL);
    try {
      const res = await fetch(resolved);
      if (!res.ok) {
        return null;
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  const importTemplateFromText = async (text: string, sourceLabel: string) => {
    let result;
    try {
      const template = parseTemplateJson(text);
      result = { template, draft: buildImportedDraft(template) };
    } catch (err) {
      api.error(err instanceof Error ? err.message : '导入失败。');
      return;
    }

    const { template, draft: importedDraft } = result;

    setDraft(importedDraft.draft);
    setFields(importedDraft.fields);
    setSelectedFieldId(importedDraft.fields[0]?.id ?? '');
    setCropEnabled(false);
    setCropRect(null);
    setCropShading(false);
    setPendingThumbnail(importedDraft.pendingThumbnail);
    setImportedHint(`Editing existing template: ${sourceLabel}`);

    const blobUrl = await fetchTemplateImage(template.url);
    if (blobUrl) {
      setMissingImageUrl(null);
      setPreviewImage(blobUrl, { isBlob: true });
      api.success(`Imported ${sourceLabel}`);
    } else {
      setPreviewImage(null, { isBlob: false });
      setMissingImageUrl(template.url);
      api.warning(`已导入 ${sourceLabel}，但无法加载图片，请手动上传。`);
    }
  };

  /**
   * Drop a fresh image and reset everything else. The "new template" path —
   * triggered when the user drops an image into the empty Dragger and there's
   * no `missingImageUrl` carried over from a failed import.
   */
  const handleImageFile = (file: File) => {
    setPreviewImage(URL.createObjectURL(file), { isBlob: true });
    setFields([]);
    setSelectedFieldId('');
    setCropEnabled(false);
    setCropRect(null);
    setCropShading(false);
    setImportedHint(null);
    setPendingThumbnail(null);
    setMissingImageUrl(null);

    const fromFile = deriveTemplateDraftFromFilename(file.name);
    const ext = extractFileExtension(file.name);
    setDraft((current) => ({
      ...current,
      name: fromFile.name || current.name,
      imageExt: ext,
    }));
  };

  /**
   * Supply the missing image after an import auto-fetch failed. Unlike
   * `handleImageFile`, this preserves the imported fields / draft / pending
   * thumbnail so the user resumes editing where they left off.
   */
  const supplyMissingImage = (file: File) => {
    setPreviewImage(URL.createObjectURL(file), { isBlob: true });
    setMissingImageUrl(null);
    const ext = extractFileExtension(file.name);
    setDraft((current) => ({ ...current, imageExt: ext }));
  };

  const isJsonFile = (file: File) =>
    file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');

  /**
   * Used by the initial Dragger only. Accepts both an image (→ new template)
   * and a JSON file (→ edit-existing flow). The "Replace image" upload further
   * down restricts itself to images so a stray .json drop in mid-edit doesn't
   * blow away the user's work.
   */
  const initialUploadProps: UploadProps = {
    accept: 'image/*,application/json,.json',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      if (isJsonFile(file)) {
        file
          .text()
          .then((text) => importTemplateFromText(text, file.name))
          .catch(() => api.error('读取 JSON 文件失败。'));
        return false;
      }

      if (!file.type.startsWith('image/')) {
        api.error('请选择图片文件或模板 JSON。');
        return Upload.LIST_IGNORE;
      }

      // Coming back to the empty state from a failed import? Treat the new
      // image as "supply the missing image", preserving fields/draft/crop.
      if (missingImageUrl) {
        supplyMissingImage(file);
      } else {
        handleImageFile(file);
      }
      return false;
    },
  };

  /** Replace-image button while editing — image only, never JSON. */
  const replaceImageUploadProps: UploadProps = {
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      if (!file.type.startsWith('image/')) {
        api.error('请选择图片文件。');
        return Upload.LIST_IGNORE;
      }

      // Replacing the image keeps the user's current text boxes / crop / draft
      // intact — only the picture changes. We *do* clear missingImageUrl since
      // the user just supplied the image manually.
      setPreviewImage(URL.createObjectURL(file), { isBlob: true });
      setMissingImageUrl(null);

      const ext = extractFileExtension(file.name);
      setDraft((current) => ({ ...current, imageExt: ext }));

      api.info('Image replaced.');
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

  const handleCropToggle = (enabled: boolean) => {
    setCropEnabled(enabled);
    if (enabled && !cropRect && imageSize.width > 0 && imageSize.height > 0) {
      setCropRect(maxCenteredCropTo43(imageSize));
    }
  };

  const handleCropReset = () => {
    if (imageSize.width <= 0 || imageSize.height <= 0) {
      return;
    }
    setCropRect(maxCenteredCropTo43(imageSize));
  };

  // Once the image's natural size is known, seed the crop rect so the overlay
  // shows up at full 4:3 the moment the user flips the Switch (we run this
  // effect after every imageSize change to also re-clamp if the user replaced
  // the image while crop was on).
  useEffect(() => {
    if (imageSize.width <= 0 || imageSize.height <= 0) {
      return;
    }
    setCropRect((current) => {
      if (!current) {
        return cropEnabled ? maxCenteredCropTo43(imageSize) : null;
      }
      return clampCropTo43(current, imageSize);
    });
  }, [imageSize, cropEnabled]);

  /**
   * Called when the preview <img> finishes loading. Beyond the usual scale
   * refresh, this is also where we apply a deferred `pendingThumbnail` from
   * the import flow — only here is `imageRef.current.natural{Width,Height}`
   * guaranteed to reflect the new image (vs. `imageSize` state which lags by
   * one render and starts from a non-zero default).
   */
  const handleImageLoad = () => {
    updatePreviewScale();

    if (!pendingThumbnail || !imageRef.current) {
      return;
    }
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      return;
    }
    const size = { width: naturalWidth, height: naturalHeight };
    const rect = clampCropTo43(normalizedToCrop(pendingThumbnail, size), size);
    setCropRect(rect);
    setCropEnabled(true);
    setPendingThumbnail(null);
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

  const setFieldStyle = <K extends keyof TextStyleSettings>(
    fieldId: string,
    key: K,
    value: TextStyleSettings[K],
  ) => {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? { ...field, styleOverrides: { ...field.styleOverrides, [key]: value } }
          : field,
      ),
    );
  };

  const applyStyleToAll = () => {
    if (!selectedField) {
      return;
    }

    // Mirror MemeEditor: copy the *effective* style (defaults + overrides) onto every
    // field so the result is independent of which keys happened to be in styleOverrides.
    const effective = resolveTextStyle(selectedField);
    setFields((current) => current.map((field) => ({ ...field, styleOverrides: { ...effective } })));
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
            {importedHint ?? '上传本地图片预览或导入现有模板 JSON，编辑后下载新的 JSON。'}
          </Typography.Paragraph>
        </div>
      </div>

      <div className="editor-grid configurator-grid">
        <Card className="preview-panel">
          {!imageUrl ? (
            <Space direction="vertical" size="middle" className="full-width-stack">
              {missingImageUrl && (
                <Alert
                  type="warning"
                  showIcon
                  message="找不到模板图片"
                  description={`无法加载 ${missingImageUrl}，请上传同一张图片继续编辑。文本框和裁剪框已保留。`}
                />
              )}
              <Upload.Dragger {...initialUploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {missingImageUrl
                    ? 'Upload the matching image to continue'
                    : 'Click or drag image or template JSON to this area'}
                </p>
                <p className="ant-upload-hint">
                  {missingImageUrl
                    ? '只接受图片；文本框和裁剪框已保留。'
                    : '图片只在浏览器内存中用于预览，不会上传。导入 JSON 时会自动加载站点内同名图片。'}
                </p>
              </Upload.Dragger>
            </Space>
          ) : (
            <Space direction="vertical" size="middle" className="full-width-stack">
              <div className="preview-actions">
                <Upload {...replaceImageUploadProps}>
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
                cropOverlay={
                  cropEnabled && cropRect ? (
                    <ThumbnailCropOverlay
                      rect={cropRect}
                      imageSize={imageSize}
                      previewScale={previewScale}
                      showShading={cropShading}
                      onChange={setCropRect}
                    />
                  ) : null
                }
                onImageLoad={handleImageLoad}
                onSelectField={setSelectedFieldId}
                onFieldRectChange={(fieldId, rect) => updateField(fieldId, rect)}
                renderField={(field) => {
                  const style = resolveTextStyle(field);
                  return (
                    <div
                      className={`preview-text ${getVerticalAlignClass(style.verticalAlign)}`}
                      style={getPreviewTextStyle(style, previewScale)}
                    >
                      {getPreviewText(field.placeholder, style)}
                    </div>
                  );
                }}
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

          <Card
            size="small"
            title="Gallery thumbnail"
            extra={
              <Switch
                size="small"
                checked={cropEnabled}
                disabled={!imageUrl}
                onChange={handleCropToggle}
                aria-label="Customize gallery thumbnail crop"
              />
            }
          >
            {cropEnabled ? (
              <Space direction="vertical" size="small" className="full-width-stack">
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                  拖动预览图上的虚线 4:3 框，调整 Gallery 卡片显示的区域。
                </Typography.Paragraph>
                <Space size="small" align="center">
                  <Switch
                    size="small"
                    checked={cropShading}
                    onChange={setCropShading}
                    aria-label="Toggle crop preview shading"
                  />
                  <Typography.Text type="secondary">Preview shading</Typography.Text>
                </Space>
                <Button size="small" onClick={handleCropReset} disabled={!imageUrl}>
                  Reset to center
                </Button>
              </Space>
            ) : (
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                关闭时，Gallery 卡片按默认居中 4:3 裁剪显示。打开后可手动选取裁剪区域。
              </Typography.Paragraph>
            )}
          </Card>

          <TemplateFieldInspector
            field={selectedField}
            imageSize={imageSize}
            effectiveStyle={selectedEffectiveStyle}
            onChange={updateField}
            onStyleChange={setFieldStyle}
            onApplyStyleToAll={applyStyleToAll}
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
