import type { EditableTextField } from '../types';
import type { Size } from '../utils/geometry';
import { TextBoxOverlay } from './TextBoxOverlay';

interface TextFieldsPreviewProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  imageUrl: string;
  imageAlt: string;
  fields: EditableTextField[];
  selectedFieldId: string;
  imageSize: Size;
  previewScale: number;
  boxClassName?: string;
  /**
   * Optional content rendered above the image but below every text box.
   * Currently used by the configurator to layer the gallery thumbnail crop
   * frame; left undefined in MemeEditor where the preview shows the full image.
   */
  cropOverlay?: React.ReactNode;
  /**
   * Optional content rendered ABOVE the image and the text boxes — a
   * decorative layer like the export watermark. Kept as a separate slot from
   * `cropOverlay` because the watermark must sit on top (so it always reads
   * over user text) while the crop frame must sit underneath the text boxes.
   */
  topOverlay?: React.ReactNode;
  onImageLoad: () => void;
  onSelectField: (fieldId: string) => void;
  onFieldRectChange: (fieldId: string, rect: Pick<EditableTextField, 'x' | 'y' | 'width' | 'height'>) => void;
  renderField: (field: EditableTextField) => React.ReactNode;
}

export function TextFieldsPreview({
  imageRef,
  imageUrl,
  imageAlt,
  fields,
  selectedFieldId,
  imageSize,
  previewScale,
  boxClassName,
  cropOverlay,
  topOverlay,
  onImageLoad,
  onSelectField,
  onFieldRectChange,
  renderField,
}: TextFieldsPreviewProps) {
  const sortedFields = fields.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="meme-preview">
      <img ref={imageRef} src={imageUrl} alt={imageAlt} onLoad={onImageLoad} />
      {cropOverlay}
      {sortedFields.map((field) => (
        <TextBoxOverlay
          key={field.id}
          rect={{ x: field.x, y: field.y, width: field.width, height: field.height }}
          imageSize={imageSize}
          previewScale={previewScale}
          selected={field.id === selectedFieldId}
          zIndex={field.zIndex}
          rotation={field.rotation}
          className={boxClassName}
          minWidth={60}
          minHeight={32}
          onSelect={() => onSelectField(field.id)}
          onChange={(rect) => onFieldRectChange(field.id, rect)}
        >
          {renderField(field)}
        </TextBoxOverlay>
      ))}
      {topOverlay}
    </div>
  );
}
