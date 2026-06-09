import { useEffect, useMemo, useRef, useState } from 'react';
import type { MemeTemplate, TextStyleOptions, TextValues } from '../types';
import { copyTemplateToClipboard, downloadTemplateImage } from '../utils/canvas';

const FONT_OPTIONS = ['Impact', 'Arial Black', 'Arial', 'Verdana', 'system-ui'];

interface MemeEditorProps {
  template: MemeTemplate;
  onBack: () => void;
}

export function MemeEditor({ template, onBack }: MemeEditorProps) {
  const [textValues, setTextValues] = useState<TextValues>(() => {
    return Object.fromEntries(template.textFields.map((field) => [field.id, field.placeholder]));
  });
  const [styleOptions, setStyleOptions] = useState<TextStyleOptions>({
    fontSize: template.textFields[0]?.fontSize ?? 42,
    color: template.textFields[0]?.color ?? '#ffffff',
    fontFamily: 'Impact',
    uppercase: true,
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const updateScale = () => {
      const naturalWidth = image.naturalWidth || image.width;
      if (!naturalWidth) {
        return;
      }

      setPreviewScale(image.clientWidth / naturalWidth);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [template.url]);

  const previewFields = useMemo(() => {
    return template.textFields.map((field) => {
      const text = textValues[field.id] || field.placeholder;
      return {
        ...field,
        text: styleOptions.uppercase ? text.toUpperCase() : text,
      };
    });
  }, [styleOptions.uppercase, template.textFields, textValues]);

  const updateText = (fieldId: string, value: string) => {
    setTextValues((current) => ({ ...current, [fieldId]: value }));
  };

  const updatePreviewScale = () => {
    const image = imageRef.current;
    if (image && image.naturalWidth) {
      setPreviewScale(image.clientWidth / image.naturalWidth);
    }
  };

  const runImageAction = async (action: 'download' | 'copy') => {
    setIsBusy(true);
    setStatusMessage('');

    try {
      if (action === 'download') {
        await downloadTemplateImage(template, textValues, styleOptions);
        setStatusMessage('图片已开始下载。');
      } else {
        await copyTemplateToClipboard(template, textValues, styleOptions);
        setStatusMessage('图片已复制到剪切板。');
      }
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

      <div className="editor-grid">
        <div className="preview-panel panel">
          <div className="meme-preview">
            <img ref={imageRef} src={template.url} alt={template.name} onLoad={updatePreviewScale} />
            {previewFields.map((field) => (
              <div
                className="preview-text"
                key={field.id}
                style={{
                  left: `${field.x * previewScale}px`,
                  top: `${field.y * previewScale}px`,
                  width: `${field.width * previewScale}px`,
                  height: `${field.height * previewScale}px`,
                  fontSize: `${styleOptions.fontSize * previewScale}px`,
                  color: styleOptions.color,
                  fontFamily: styleOptions.fontFamily,
                  textAlign: field.align,
                }}
              >
                {field.text}
              </div>
            ))}
          </div>
        </div>

        <aside className="control-panel panel">
          <div className="control-section">
            <h3>文字内容</h3>
            {template.textFields.map((field) => (
              <label className="field-control" key={field.id}>
                <span>{field.placeholder}</span>
                <textarea
                  value={textValues[field.id] ?? ''}
                  onChange={(event) => updateText(field.id, event.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              </label>
            ))}
          </div>

          <div className="control-section">
            <h3>样式</h3>
            <label className="field-control">
              <span>字号：{styleOptions.fontSize}px</span>
              <input
                type="range"
                min="20"
                max="100"
                value={styleOptions.fontSize}
                onChange={(event) =>
                  setStyleOptions((current) => ({ ...current, fontSize: Number(event.target.value) }))
                }
              />
            </label>
            <label className="field-control inline-control">
              <span>颜色</span>
              <input
                type="color"
                value={styleOptions.color}
                onChange={(event) => setStyleOptions((current) => ({ ...current, color: event.target.value }))}
              />
            </label>
            <label className="field-control">
              <span>字体</span>
              <select
                value={styleOptions.fontFamily}
                onChange={(event) => setStyleOptions((current) => ({ ...current, fontFamily: event.target.value }))}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle-control">
              <input
                type="checkbox"
                checked={styleOptions.uppercase}
                onChange={(event) => setStyleOptions((current) => ({ ...current, uppercase: event.target.checked }))}
              />
              <span>英文自动大写</span>
            </label>
          </div>

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
