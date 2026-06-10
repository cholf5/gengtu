import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../utils/geometry';

const DEFAULT_IMAGE_SIZE: Size = { width: 900, height: 600 };

export function useImagePreviewScale(imageSrc: string) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [imageSize, setImageSize] = useState<Size>(DEFAULT_IMAGE_SIZE);

  const updatePreviewScale = useCallback(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setImageSize({ width: naturalWidth, height: naturalHeight });
    setPreviewScale(image.clientWidth / naturalWidth || 1);
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    updatePreviewScale();

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [imageSrc, updatePreviewScale]);

  return { imageRef, imageSize, previewScale, updatePreviewScale };
}
