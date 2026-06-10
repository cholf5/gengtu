import { useEffect, useState } from 'react';
import type { EditableTextField, MemeTemplate, TextStyleSettings, VerticalAlign } from '../types';
import { useImagePreviewScale } from '../hooks/useImagePreviewScale';
import { copyEditableMemeToClipboard, downloadEditableMemeImage } from '../utils/canvas';
import { createEditableFields, createNewEditableField, resolveTextStyle } from '../utils/textStyles';
import { SelectedTextInspector } from './SelectedTextInspector';
import { TextFieldsPreview } from './TextFieldsPreview';

interface MemeEditorProps {
  template: MemeTemplate;
  onBack: () => void;
}

function updateField(fields: EditableTextField[], fieldId: string, updater: (field: EditableTextField) => EditableTextField) {
  return fields.map((field) => (field.id === fieldId ? updater(field) : field));
}

function getPreviewText(field: EditableTextField, style: TextStyleSettings) {
  return style.uppercase ? field.text.toUpperCase() : field.text;
}

function getPreviewTextStyle(style: TextStyleSettings, scale: number): React.CSSProperties {
  const strokeWidth = Math.max(0, style.outlineWidth * scale);
  const previewFontSize = Math.min(style.fontSize, style.maxFontSize);

  return {
    fontSize: `${previewFontSize * scale}px`,
    color: style.fontColor,
    fontFamily: style.fontFamily,
    fontWeight: style.bold ? 900 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
    opacity: style.opacity,
    textAlign: style.textAlign,
    WebkitTextStroke: style.effect === 'outline' ? `${strokeWidth}px ${style.outlineColor}` : undefined,
    textShadow:
      style.effect === 'shadow'
        ? `${strokeWidth || 3}px ${strokeWidth || 3}px ${Math.max(4, strokeWidth * 2)}px ${style.outlineColor}`
        : undefined,
  };
}

function getVerticalClass(verticalAlign: VerticalAlign) {
  if (verticalAlign === 'top') {
    return 'align-top';
  }

  if (verticalAlign === 'bottom') {
    return 'align-bottom';
  }

  return 'align-middle';
}

export function MemeEditor({ template, onBack }: MemeEditorProps) {
  const [fields, setFields] = useState<EditableTextField[]>(() => createEditableFields(template.textFields));
  const [selectedFieldId, setSelectedFieldId] = useState(template.textFields[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [shouldWarnBeforeUnload, setShouldWarnBeforeUnload] = useState(false);
  const { imageRef, imageSize, previewScale, updatePreviewScale } = useImagePreviewScale(template.url);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;

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
    setFields((current) => updateField(current, fieldId, (field) => ({ ...field, text: value })));
    markEdited();
  };

  const setFieldStyle = <K extends keyof TextStyleSettings>(
    fieldId: string,
    key: K,
    value: TextStyleSettings[K],
  ) => {
    setFields((current) =>
      updateField(current, fieldId, (field) => ({
        ...field,
        styleOverrides: {
          ...field.styleOverrides,
          [key]: value,
        },
      })),
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
        await downloadEditableMemeImage(template, fields);
        setStatusMessage('图片已开始下载。');
      } else {
        await copyEditableMemeToClipboard(template, fields);
        setStatusMessage('图片已复制到剪切板。');
      }

      setShouldWarnBeforeUnload(false);
    } catch (error) {
      const fallback = action === 'copy' ? '复制不可用，请下载图片。' : '生成图片失败，请稍后重试。';
      setStatusMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="editor-layout" aria-label={`${template.name} 编辑器`}>
      <div className="editor-toolbar">
        <button className="secondary-button" type="button" onClick={onBack}>
          ← 返回模板
        </button>
        <div>
          <h2>{template.name}</h2>
          <p>{template.tags.join(' · ')}</p>
        </div>
      </div>

      <div className="editor-grid inspector-mode">
        <div className="preview-panel panel">
          <div className="preview-actions">
            <button className="secondary-button" type="button" onClick={addTextField}>
              + Add text box
            </button>
          </div>
          <TextFieldsPreview
            imageRef={imageRef}
            imageUrl={template.url}
            imageAlt={template.name}
            fields={fields}
            selectedFieldId={selectedFieldId}
            imageSize={imageSize}
            previewScale={previewScale}
            onImageLoad={updatePreviewScale}
            onSelectField={setSelectedFieldId}
            onFieldRectChange={(fieldId, rect) => {
              setFields((current) => updateField(current, fieldId, (field) => ({ ...field, ...rect })));
              markEdited();
            }}
            renderField={(field) => {
              const style = resolveTextStyle(field);
              return (
                <div className={`preview-text ${getVerticalClass(style.verticalAlign)}`} style={getPreviewTextStyle(style, previewScale)}>
                  {getPreviewText(field, style)}
                </div>
              );
            }}
          />
        </div>

        <aside className="control-panel inspector-panel panel">
          {selectedField ? (
            <SelectedTextInspector
              field={selectedField}
              effectiveStyle={resolveTextStyle(selectedField)}
              onTextChange={(value) => setFieldValue(selectedField.id, value)}
              onStyleChange={(key, value) => setFieldStyle(selectedField.id, key, value)}
              onRemove={removeSelectedField}
              onBringToTop={bringSelectedToTop}
              onApplyToAll={applySelectedStyleToAll}
            />
          ) : (
            <div className="inspector-card empty-inspector">选择或新增一个文本框来编辑属性。</div>
          )}

          <div className="action-row">
            <button className="primary-button" type="button" disabled={isBusy} onClick={() => runImageAction('download')}>
              下载 PNG
            </button>
            <button className="secondary-button" type="button" disabled={isBusy} onClick={() => runImageAction('copy')}>
              复制图片
            </button>
          </div>

          {statusMessage && <p className="status-message" role="status">{statusMessage}</p>}
        </aside>
      </div>
    </section>
  );
}
