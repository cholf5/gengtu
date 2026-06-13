export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoxConstraints {
  minWidth: number;
  minHeight: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function toPreviewRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function fromPreviewRect(rect: Rect, scale: number): Rect {
  const safeScale = scale || 1;
  return {
    x: rect.x / safeScale,
    y: rect.y / safeScale,
    width: rect.width / safeScale,
    height: rect.height / safeScale,
  };
}

export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function clampBoxToImage(rect: Rect, imageSize: Size, constraints: BoxConstraints): Rect {
  const width = clamp(rect.width, constraints.minWidth, imageSize.width);
  const height = clamp(rect.height, constraints.minHeight, imageSize.height);

  return {
    x: clamp(rect.x, 0, Math.max(0, imageSize.width - width)),
    y: clamp(rect.y, 0, Math.max(0, imageSize.height - height)),
    width,
    height,
  };
}

/** 4:3 aspect ratio used by Gallery cards — single source of truth. */
export const THUMBNAIL_ASPECT_RATIO = 4 / 3;

/**
 * Largest 4:3 rectangle that fits inside `imageSize`, centered. Used as the
 * default thumbnail crop when the author first enables "Customize crop" — the
 * result reproduces the existing `object-fit: cover` look exactly.
 */
export function maxCenteredCropTo43(imageSize: Size): Rect {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const imageRatio = imageSize.width / imageSize.height;
  let width: number;
  let height: number;
  if (imageRatio >= THUMBNAIL_ASPECT_RATIO) {
    // Image is wider than 4:3 → height is the limiter.
    height = imageSize.height;
    width = height * THUMBNAIL_ASPECT_RATIO;
  } else {
    // Image is taller / narrower → width is the limiter.
    width = imageSize.width;
    height = width / THUMBNAIL_ASPECT_RATIO;
  }

  return {
    x: (imageSize.width - width) / 2,
    y: (imageSize.height - height) / 2,
    width,
    height,
  };
}

/**
 * Clamp a rect inside `imageSize` while preserving the 4:3 aspect ratio.
 *
 * Plain `clampBoxToImage` would happily distort the box when an edge is over
 * the boundary — for the thumbnail crop we'd rather shrink uniformly and then
 * re-position. This shrinks the box to fit (capped by `maxCenteredCropTo43`)
 * and slides it back inside the image.
 */
export function clampCropTo43(rect: Rect, imageSize: Size): Rect {
  const max = maxCenteredCropTo43(imageSize);
  if (max.width <= 0 || max.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const width = clamp(rect.width, 0, max.width);
  const height = width / THUMBNAIL_ASPECT_RATIO;
  return {
    x: clamp(rect.x, 0, imageSize.width - width),
    y: clamp(rect.y, 0, imageSize.height - height),
    width,
    height,
  };
}

export interface NormalizedCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Convert a natural-pixel crop rect to 0..1 normalized coordinates. */
export function cropToNormalized(rect: Rect, imageSize: Size): NormalizedCrop {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: rect.x / imageSize.width,
    y: rect.y / imageSize.height,
    width: rect.width / imageSize.width,
    height: rect.height / imageSize.height,
  };
}

/** Inverse of `cropToNormalized`: expand a 0..1 crop back to natural pixels. */
export function normalizedToCrop(crop: NormalizedCrop, imageSize: Size): Rect {
  return {
    x: crop.x * imageSize.width,
    y: crop.y * imageSize.height,
    width: crop.width * imageSize.width,
    height: crop.height * imageSize.height,
  };
}
