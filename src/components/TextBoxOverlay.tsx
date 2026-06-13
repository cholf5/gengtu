import { Rnd } from 'react-rnd';
import type { Rect, Size } from '../utils/geometry';
import { clampBoxToImage, fromPreviewRect, toPreviewRect } from '../utils/geometry';

interface TextBoxOverlayProps {
  rect: Rect;
  imageSize: Size;
  previewScale: number;
  selected: boolean;
  zIndex: number;
  /** Clockwise rotation in degrees, applied to the visible frame around its center. */
  rotation?: number;
  /**
   * Class applied to the visible inner frame (dashed border / selection ring).
   * The Rnd outer stays an invisible axis-aligned hit-box so drag/resize math
   * keeps working — only the inner frame rotates.
   */
  className?: string;
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
  onSelect: () => void;
  onChange: (rect: Rect) => void;
}

export function TextBoxOverlay({
  rect,
  imageSize,
  previewScale,
  selected,
  zIndex,
  rotation = 0,
  className = 'editable-text-box',
  minWidth = 40,
  minHeight = 24,
  children,
  onSelect,
  onChange,
}: TextBoxOverlayProps) {
  const previewRect = toPreviewRect(rect, previewScale);

  return (
    <Rnd
      bounds="parent"
      className="text-box-root"
      position={{ x: previewRect.x, y: previewRect.y }}
      size={{ width: previewRect.width, height: previewRect.height }}
      style={{ zIndex }}
      minWidth={minWidth * previewScale}
      minHeight={minHeight * previewScale}
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation();
        onSelect();
      }}
      onDragStart={onSelect}
      onDragStop={(_, data) => {
        const next = fromPreviewRect({ ...previewRect, x: data.x, y: data.y }, previewScale);
        onChange(clampBoxToImage(next, imageSize, { minWidth, minHeight }));
      }}
      onResizeStart={onSelect}
      onResizeStop={(_, __, ref, ___, position) => {
        const next = fromPreviewRect(
          {
            x: position.x,
            y: position.y,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
          },
          previewScale,
        );
        onChange(clampBoxToImage(next, imageSize, { minWidth, minHeight }));
      }}
    >
      <div
        className={`text-box-frame ${className} ${selected ? 'is-selected' : ''}`}
        style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
      >
        {children}
      </div>
    </Rnd>
  );
}
