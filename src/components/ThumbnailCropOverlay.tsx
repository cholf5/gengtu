import { Rnd } from 'react-rnd';
import type { Rect, Size } from '../utils/geometry';
import { THUMBNAIL_ASPECT_RATIO, clampCropTo43, fromPreviewRect, toPreviewRect } from '../utils/geometry';

interface ThumbnailCropOverlayProps {
  rect: Rect;
  imageSize: Size;
  previewScale: number;
  /** When true, the area outside the crop is dimmed so the author can preview
   *  what the gallery card will show. Off by default so the dimming doesn't
   *  fight with adding/dragging text boxes. */
  showShading: boolean;
  onChange: (rect: Rect) => void;
}

const MIN_NATURAL_SIZE = 40;

/**
 * Dashed 4:3 crop frame layered above the image but below text boxes. The
 * dimmed area outside the frame is drawn via a giant box-shadow on the inner
 * frame, which avoids a second wrapping element and keeps the math identical
 * to TextBoxOverlay.
 *
 * Coordinates are stored in NATURAL image pixels; the overlay multiplies by
 * `previewScale` for display and divides back via `fromPreviewRect` on
 * drag/resize end. The aspect ratio is locked to 4:3 (matches Gallery cards).
 */
export function ThumbnailCropOverlay({ rect, imageSize, previewScale, showShading, onChange }: ThumbnailCropOverlayProps) {
  const previewRect = toPreviewRect(rect, previewScale);
  const minPreviewWidth = MIN_NATURAL_SIZE * previewScale;
  const minPreviewHeight = (MIN_NATURAL_SIZE / THUMBNAIL_ASPECT_RATIO) * previewScale;

  return (
    <Rnd
      bounds="parent"
      className="thumbnail-crop-root"
      position={{ x: previewRect.x, y: previewRect.y }}
      size={{ width: previewRect.width, height: previewRect.height }}
      lockAspectRatio={THUMBNAIL_ASPECT_RATIO}
      minWidth={minPreviewWidth}
      minHeight={minPreviewHeight}
      onDragStop={(_, data) => {
        const next = fromPreviewRect({ ...previewRect, x: data.x, y: data.y }, previewScale);
        onChange(clampCropTo43(next, imageSize));
      }}
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
        onChange(clampCropTo43(next, imageSize));
      }}
    >
      <div className={`thumbnail-crop-frame ${showShading ? 'is-shaded' : ''}`} />
    </Rnd>
  );
}
