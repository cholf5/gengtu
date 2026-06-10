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
