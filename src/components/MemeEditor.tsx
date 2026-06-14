import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Space, Tooltip, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { track } from '@vercel/analytics';
import type { EditableTextField, MemeTemplate, TextStyleSettings } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import { copyEditableMemeToClipboard, downloadEditableMemeImage } from '../utils/canvas';
import { getWatermarkPreviewStyle, WATERMARK_TEXT } from '../utils/watermark';
import {
  createEditableFields,
  createNewEditableField,
  getPreviewText,
  getPreviewTextStyle,
  getVerticalAlignClass,
  resolveTextStyle,
} from '../utils/textStyles';
import { useUndoableState } from '../utils/useUndoableState';
import { useUndoKeyboard } from '../utils/useUndoKeyboard';
import { SelectedTextInspector } from './SelectedTextInspector';
import { TextFieldsPreview } from './TextFieldsPreview';

interface MemeEditorProps {
  template: MemeTemplate;
  onBack: () => void;
}

function updateField(fields: EditableTextField[], fieldId: string, updater: (field: EditableTextField) => EditableTextField) {
  return fields.map((field) => (field.id === fieldId ? updater(field) : field));
}

export function MemeEditor({ template, onBack }: MemeEditorProps) {
  const {
    state: fields,
    setState: setFields,
    undo,
    redo,
    reset: resetFields,
    canUndo,
    canRedo,
  } = useUndoableState<EditableTextField[]>(() => createEditableFields(template.textFields));
  const [selectedFieldId, setSelectedFieldId] = useState(template.textFields[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [shouldWarnBeforeUnload, setShouldWarnBeforeUnload] = useState(false);
  // Default-on; intentionally not persisted across sessions — see design doc
  // § decision 6. Each export is an independent decision.
  const [withWatermark, setWithWatermark] = useState(true);
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(template.url);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;

  // When the parent swaps the template prop without unmounting MemeEditor,
  // wipe the undo stack and re-seed `fields` from the new template. This also
  // covers a latent bug: `useState(() => …)` only ran once on mount, so prior
  // template changes left stale field data in place.
  //
  // Depend on `template.id` (the semantic identity) rather than `template`
  // itself: if the parent ever rebuilds the template object without changing
  // its id (e.g. a hypothetical reload of the manifest), we must NOT discard
  // the user's in-flight edits and undo stack. See review doc § #6.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    resetFields(createEditableFields(template.textFields));
    setSelectedFieldId(template.textFields[0]?.id ?? '');
    setStatusMessage('');
    setShouldWarnBeforeUnload(false);
  }, [template.id, resetFields]);

  useUndoKeyboard(undo, redo, canUndo, canRedo);

  // After undo/redo (and any other path that mutates `fields`), the previously
  // selected field id might no longer exist. Fall back to the first remaining
  // field — keeps the inspector populated rather than silently going blank.
  // See review doc § #5.
  useEffect(() => {
    if (selectedFieldId && !fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0]?.id ?? '');
    }
  }, [fields, selectedFieldId]);

  useEffect(() => {
    if (!shouldWarnBeforeUnload) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldWarnBeforeUnload]);

  const markEdited = () => {
    setShouldWarnBeforeUnload(true);
    setStatusMessage('');
  };

  const setFieldValue = (fieldId: string, value: string) => {
    setFields(
      (current) => updateField(current, fieldId, (field) => ({ ...field, text: value })),
      { coalesceKey: `text:${fieldId}` },
    );
    markEdited();
  };

  const setFieldRotation = (fieldId: string, value: number) => {
    setFields(
      (current) => updateField(current, fieldId, (field) => ({ ...field, rotation: value })),
      { coalesceKey: `rotation:${fieldId}` },
    );
    markEdited();
  };

  const setFieldStyle = <K extends keyof TextStyleSettings>(
    fieldId: string,
    key: K,
    value: TextStyleSettings[K],
  ) => {
    // Merge consecutive numeric tweaks (font size / outline width / opacity
    // sliders) but keep discrete picks (color, alignment, bold/italic toggles,
    // effect mode) as standalone undo steps — see design doc § 4.
    const isNumeric = typeof value === 'number';
    setFields(
      (current) =>
        updateField(current, fieldId, (field) => ({
          ...field,
          styleOverrides: {
            ...field.styleOverrides,
            [key]: value,
          },
        })),
      isNumeric ? { coalesceKey: `style:${fieldId}:${String(key)}` } : undefined,
    );
    markEdited();
  };

  const addTextField = () => {
    const nextIndex = fields.length + 1;
    const nextZIndex = Math.max(0, ...fields.map((field) => field.zIndex)) + 1;
    const newField = createNewEditableField(nextIndex, imageSize.width, imageSize.height);
    const field = { ...newField, zIndex: nextZIndex };

    setFields((current) => [...current, field]);
    setSelectedFieldId(field.id);
    markEdited();
  };

  const removeSelectedField = () => {
    if (!selectedField) {
      return;
    }

    const remaining = fields.filter((field) => field.id !== selectedField.id);
    setFields(remaining);
    setSelectedFieldId(remaining[0]?.id ?? '');
    markEdited();
  };

  // Pressing Delete / Backspace removes the selected text box, but only when
  // focus isn't inside a text input — otherwise we'd hijack the user's typing
  // inside the Inspector's textarea. Removal is reversible via Ctrl+Z, so we
  // skip the confirm dialog and let undo serve as the safety net.
  useEffect(() => {
    if (!selectedField) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      removeSelectedField();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedField]);

  const bringSelectedToTop = () => {
    if (!selectedField) {
      return;
    }

    const nextZIndex = Math.max(0, ...fields.map((field) => field.zIndex)) + 1;
    setFields((current) => updateField(current, selectedField.id, (field) => ({ ...field, zIndex: nextZIndex })));
    markEdited();
  };

  const applySelectedStyleToAll = () => {
    if (!selectedField) {
      return;
    }

    const effectiveStyle = resolveTextStyle(selectedField);
    setFields((current) =>
      current.map((field) => ({
        ...field,
        styleOverrides: effectiveStyle,
      })),
    );
    markEdited();
  };

  const runImageAction = async (action: 'download' | 'copy') => {
    setIsBusy(true);
    setStatusMessage('');

    try {
      if (action === 'download') {
        await downloadEditableMemeImage(template, fields, withWatermark);
        setStatusMessage('图片已开始下载。');
      } else {
        await copyEditableMemeToClipboard(template, fields, withWatermark);
        setStatusMessage('图片已复制到剪切板。');
      }

      setShouldWarnBeforeUnload(false);
      track('meme_export', { templateId: template.id, action, ok: true, watermark: withWatermark });
    } catch (error) {
      const fallback = action === 'copy' ? '复制不可用，请下载图片。' : '生成图片失败，请稍后重试。';
      setStatusMessage(error instanceof Error ? error.message : fallback);
      track('meme_export', { templateId: template.id, action, ok: false, watermark: withWatermark });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="editor-layout" aria-label={`${template.name} 编辑器`}>
      <div className="editor-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          返回模板
        </Button>
        <Space.Compact>
          {/*
            Antd Tooltip can't pick up mouse events on a disabled <button>, so
            wrap each button in a <span> the tooltip can hover-detect. This
            keeps the shortcut hint visible even when the action is unavailable.
          */}
          <Tooltip title="撤销 (Ctrl+Z)">
            <span style={{ display: 'inline-block' }}>
              <Button icon={<UndoOutlined />} onClick={undo} disabled={!canUndo} aria-label="撤销" />
            </span>
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <span style={{ display: 'inline-block' }}>
              <Button icon={<RedoOutlined />} onClick={redo} disabled={!canRedo} aria-label="重做" />
            </span>
          </Tooltip>
        </Space.Compact>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {template.name}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            {template.tags.join(' · ')}
          </Typography.Paragraph>
        </div>
      </div>

      <div className="editor-grid inspector-mode">
        <Card className="preview-panel">
          <Space direction="vertical" size="middle" className="full-width-stack">
            <div className="preview-actions">
              <Button icon={<PlusOutlined />} onClick={addTextField}>
                Add text box
              </Button>
            </div>
            <TextFieldsPreview
              imageRef={imageRef}
              imageUrl={template.url}
              imageAlt={template.name}
              fields={fields}
              selectedFieldId={selectedFieldId}
              imageSize={imageSize}
              previewScale={previewScale}
              topOverlay={
                withWatermark && imageSize.height > 0 ? (
                  <WatermarkPreview previewHeightPx={imageSize.height * previewScale} />
                ) : null
              }
              onImageLoad={updatePreviewScale}
              onSelectField={setSelectedFieldId}
              onFieldRectChange={(fieldId, rect) => {
                setFields(
                  (current) => updateField(current, fieldId, (field) => ({ ...field, ...rect })),
                  { coalesceKey: `rect:${fieldId}` },
                );
                markEdited();
              }}
              renderField={(field) => {
                const style = resolveTextStyle(field);
                return (
                  <div className={`preview-text ${getVerticalAlignClass(style.verticalAlign)}`} style={getPreviewTextStyle(style, previewScale, imageSize.height)}>
                    {getPreviewText(field.text, style)}
                  </div>
                );
              }}
            />
          </Space>
        </Card>

        <aside className="control-panel inspector-panel">
          {selectedField ? (
            <SelectedTextInspector
              field={selectedField}
              effectiveStyle={resolveTextStyle(selectedField)}
              onTextChange={(value) => setFieldValue(selectedField.id, value)}
              onRotationChange={(value) => setFieldRotation(selectedField.id, value)}
              onStyleChange={(key, value) => setFieldStyle(selectedField.id, key, value)}
              onRemove={removeSelectedField}
              onBringToTop={bringSelectedToTop}
              onApplyToAll={applySelectedStyleToAll}
            />
          ) : (
            <Card size="small">
              <Empty description="选择或新增一个文本框来编辑属性。" />
            </Card>
          )}

          <Checkbox
            checked={withWatermark}
            onChange={(event) => setWithWatermark(event.target.checked)}
          >
            导出时带水印
          </Checkbox>

          <Space.Compact block>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={isBusy}
              onClick={() => runImageAction('download')}
              style={{ flex: 1 }}
            >
              下载 PNG
            </Button>
            <Button
              icon={<CopyOutlined />}
              loading={isBusy}
              onClick={() => runImageAction('copy')}
              style={{ flex: 1 }}
            >
              复制图片
            </Button>
          </Space.Compact>

          {statusMessage && <Alert type="info" showIcon message={statusMessage} />}
        </aside>
      </div>
    </section>
  );
}

/**
 * Live preview counterpart of `drawWatermark` from `src/utils/watermark.ts`.
 * Both render paths read the same shared constants so the preview stays in
 * sync with the exported PNG. Sized in displayed CSS pixels.
 */
function WatermarkPreview({ previewHeightPx }: { previewHeightPx: number }) {
  return (
    <span style={getWatermarkPreviewStyle(previewHeightPx)} aria-hidden="true">
      {WATERMARK_TEXT}
    </span>
  );
}
