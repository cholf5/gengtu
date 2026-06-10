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
  onImageLoad,
  onSelectField,
  onFieldRectChange,
  renderField,
}: TextFieldsPreviewProps) {
  const sortedFields = fields.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="meme-preview">
      <img ref={imageRef} src={imageUrl} alt={imageAlt} onLoad={onImageLoad} />
      {sortedFields.map((field) => (
        <TextBoxOverlay
          key={field.id}
          rect={{ x: field.x, y: field.y, width: field.width, height: field.height }}
          imageSize={imageSize}
          previewScale={previewScale}
          selected={field.id === selectedFieldId}
          zIndex={field.zIndex}
          className={boxClassName}
          minWidth={60}
          minHeight={32}
          onSelect={() => onSelectField(field.id)}
          onChange={(rect) => onFieldRectChange(field.id, rect)}
        >
          {renderField(field)}
        </TextBoxOverlay>
      ))}
    </div>
  );
}
