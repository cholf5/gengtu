import { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import type { EditableTextField, MemeTemplate, TextAlign, TextEffect, TextStyleSettings, VerticalAlign } from '../types';
import { copyEditableMemeToClipboard, downloadEditableMemeImage } from '../utils/canvas';
import { createEditableFields, createNewEditableField, resolveTextStyle } from '../utils/textStyles';

const FONT_OPTIONS = ['Impact', 'Arial Black', 'Arial', 'Verdana', 'Comic Sans MS', 'system-ui'];
const EFFECT_OPTIONS: TextEffect[] = ['outline', 'shadow', 'none'];
const TEXT_ALIGN_OPTIONS: TextAlign[] = ['left', 'center', 'right'];
const VERTICAL_ALIGN_OPTIONS: VerticalAlign[] = ['top', 'middle', 'bottom'];

interface MemeEditorProps {
  template: MemeTemplate;
  onBack: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [previewScale, setPreviewScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 900, height: 600 });
  const [shouldWarnBeforeUnload, setShouldWarnBeforeUnload] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const updateScale = () => {
      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;
      if (!naturalWidth || !naturalHeight) {
        return;
      }

      setImageSize({ width: naturalWidth, height: naturalHeight });
      setPreviewScale(image.clientWidth / naturalWidth);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [template.url]);

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

  const sortedFields = useMemo(() => fields.slice().sort((a, b) => a.zIndex - b.zIndex), [fields]);

  const markEdited = () => {
    setShouldWarnBeforeUnload(true);
    setStatusMessage('');
  };

  const updatePreviewScale = () => {
    const image = imageRef.current;
    if (image && image.naturalWidth) {
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      setPreviewScale(image.clientWidth / image.naturalWidth);
    }
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
          <div className="meme-preview">
            <img ref={imageRef} src={template.url} alt={template.name} onLoad={updatePreviewScale} />
            {sortedFields.map((field) => {
              const style = resolveTextStyle(field);
              return (
                <Rnd
                  bounds="parent"
                  className={`editable-text-box ${field.id === selectedFieldId ? 'is-selected' : ''}`}
                  key={field.id}
                  position={{ x: field.x * previewScale, y: field.y * previewScale }}
                  size={{ width: field.width * previewScale, height: field.height * previewScale }}
                  style={{ zIndex: field.zIndex }}
                  minWidth={60 * previewScale}
                  minHeight={32 * previewScale}
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  onDragStart={() => setSelectedFieldId(field.id)}
                  onDragStop={(_, data) => {
                    setFields((current) =>
                      updateField(current, field.id, (currentField) => ({
                        ...currentField,
                        x: clamp(data.x / previewScale, 0, imageSize.width - currentField.width),
                        y: clamp(data.y / previewScale, 0, imageSize.height - currentField.height),
                      })),
                    );
                    markEdited();
                  }}
                  onResizeStart={() => setSelectedFieldId(field.id)}
                  onResizeStop={(_, __, ref, ___, position) => {
                    const width = ref.offsetWidth / previewScale;
                    const height = ref.offsetHeight / previewScale;
                    setFields((current) =>
                      updateField(current, field.id, (currentField) => ({
                        ...currentField,
                        width: clamp(width, 40, imageSize.width),
                        height: clamp(height, 24, imageSize.height),
                        x: clamp(position.x / previewScale, 0, imageSize.width - width),
                        y: clamp(position.y / previewScale, 0, imageSize.height - height),
                      })),
                    );
                    markEdited();
                  }}
                >
                  <div className={`preview-text ${getVerticalClass(style.verticalAlign)}`} style={getPreviewTextStyle(style, previewScale)}>
                    {getPreviewText(field, style)}
                  </div>
                </Rnd>
              );
            })}
          </div>
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

interface StyleInspectorProps {
  title: string;
  style: TextStyleSettings;
  onChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void;
}

function StyleInspector({ title, style, onChange }: StyleInspectorProps) {
  return (
    <div className="inspector-card">
      <h3>{title}</h3>
      <label className="inspector-row">
        <span>Font</span>
        <select value={style.fontFamily} onChange={(event) => onChange('fontFamily', event.target.value)}>
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>
      <div className="inspector-row color-row">
        <span>Font Color</span>
        <input type="color" value={style.fontColor} onChange={(event) => onChange('fontColor', event.target.value)} />
      </div>
      <div className="inspector-row color-row">
        <span>Outline Color</span>
        <input type="color" value={style.outlineColor} onChange={(event) => onChange('outlineColor', event.target.value)} />
      </div>
      <div className="option-row">
        <label>
          <input type="checkbox" checked={style.uppercase} onChange={(event) => onChange('uppercase', event.target.checked)} />
          ALL CAPS
        </label>
        <label>
          <input type="checkbox" checked={style.bold} onChange={(event) => onChange('bold', event.target.checked)} />
          <strong>Bold</strong>
        </label>
        <label>
          <input type="checkbox" checked={style.italic} onChange={(event) => onChange('italic', event.target.checked)} />
          <em>Italic</em>
        </label>
      </div>
      <div className="option-row">
        {EFFECT_OPTIONS.map((effect) => (
          <label key={effect}>
            <input
              type="radio"
              name={`${title}-effect`}
              checked={style.effect === effect}
              onChange={() => onChange('effect', effect)}
            />
            {effect}
          </label>
        ))}
      </div>
      <label className="inspector-row">
        <span>Font Size</span>
        <input type="number" min="12" max="160" value={style.fontSize} onChange={(event) => onChange('fontSize', Number(event.target.value))} />
      </label>
      <label className="inspector-row">
        <span>Outline Width</span>
        <input type="number" min="0" max="24" value={style.outlineWidth} onChange={(event) => onChange('outlineWidth', Number(event.target.value))} />
      </label>
      <label className="inspector-row">
        <span>Max Font Size (px)</span>
        <input type="number" min="12" max="180" value={style.maxFontSize} onChange={(event) => onChange('maxFontSize', Number(event.target.value))} />
      </label>
      <label className="inspector-row">
        <span>Text Align</span>
        <select value={style.textAlign} onChange={(event) => onChange('textAlign', event.target.value as TextAlign)}>
          {TEXT_ALIGN_OPTIONS.map((align) => (
            <option key={align} value={align}>
              {align}
            </option>
          ))}
        </select>
      </label>
      <label className="inspector-row">
        <span>Vertical Align</span>
        <select value={style.verticalAlign} onChange={(event) => onChange('verticalAlign', event.target.value as VerticalAlign)}>
          {VERTICAL_ALIGN_OPTIONS.map((align) => (
            <option key={align} value={align}>
              {align}
            </option>
          ))}
        </select>
      </label>
      <label className="inspector-row slider-row">
        <span>Opacity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={style.opacity}
          onChange={(event) => onChange('opacity', Number(event.target.value))}
        />
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={style.opacity}
          onChange={(event) => onChange('opacity', Number(event.target.value))}
        />
      </label>
    </div>
  );
}

interface SelectedTextInspectorProps {
  field: EditableTextField;
  effectiveStyle: TextStyleSettings;
  onTextChange: (value: string) => void;
  onStyleChange: <K extends keyof TextStyleSettings>(key: K, value: TextStyleSettings[K]) => void;
  onRemove: () => void;
  onBringToTop: () => void;
  onApplyToAll: () => void;
}

function SelectedTextInspector({
  field,
  effectiveStyle,
  onTextChange,
  onStyleChange,
  onRemove,
  onBringToTop,
  onApplyToAll,
}: SelectedTextInspectorProps) {
  return (
    <div className="inspector-card selected-inspector">
      <div className="inspector-title-row">
        <h3>Selected Text Inspector</h3>
        <button className="remove-button" type="button" onClick={onRemove}>
          remove
        </button>
      </div>
      <label className="field-control inspector-textarea">
        <span>Content</span>
        <textarea value={field.text} onChange={(event) => onTextChange(event.target.value)} rows={3} />
      </label>
      <StyleInspector title="Text Settings" style={effectiveStyle} onChange={onStyleChange} />
      <button className="inspector-action" type="button" onClick={onBringToTop}>
        Bring to top layer
      </button>
      <button className="inspector-action full-width" type="button" onClick={onApplyToAll}>
        Apply these settings to ALL text boxes
      </button>
    </div>
  );
}
