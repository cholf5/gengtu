import { describe, expect, it } from 'vitest';
import {
  clamp,
  clampBoxToImage,
  clampCropTo43,
  cropToNormalized,
  fromPreviewRect,
  maxCenteredCropTo43,
  normalizedToCrop,
  roundRect,
  toPreviewRect,
} from './geometry';

describe('geometry helpers', () => {
  it('clamps numbers into a range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(50, 0, 10)).toBe(10);
  });

  it('converts rects between original and preview coordinates', () => {
    const original = { x: 10, y: 20, width: 100, height: 50 };
    expect(toPreviewRect(original, 0.5)).toEqual({ x: 5, y: 10, width: 50, height: 25 });
    expect(fromPreviewRect({ x: 5, y: 10, width: 50, height: 25 }, 0.5)).toEqual(original);
  });

  it('rounds rect values for JSON output', () => {
    expect(roundRect({ x: 1.2, y: 1.6, width: 10.4, height: 10.5 })).toEqual({
      x: 1,
      y: 2,
      width: 10,
      height: 11,
    });
  });

  it('keeps boxes inside image bounds', () => {
    expect(
      clampBoxToImage(
        { x: 95, y: -5, width: 20, height: 10 },
        { width: 100, height: 80 },
        { minWidth: 8, minHeight: 6 },
      ),
    ).toEqual({ x: 80, y: 0, width: 20, height: 10 });
  });
});

describe('thumbnail crop helpers', () => {
  it('returns the largest 4:3 rect centered inside a wide image', () => {
    // 1600x600 → height limits, width = 600 * 4/3 = 800.
    expect(maxCenteredCropTo43({ width: 1600, height: 600 })).toEqual({
      x: 400,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it('returns the largest 4:3 rect centered inside a tall image', () => {
    // 600x1600 → width limits, height = 600 / (4/3) = 450.
    expect(maxCenteredCropTo43({ width: 600, height: 1600 })).toEqual({
      x: 0,
      y: 575,
      width: 600,
      height: 450,
    });
  });

  it('returns the full image when it is exactly 4:3', () => {
    expect(maxCenteredCropTo43({ width: 800, height: 600 })).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it('clampCropTo43 preserves 4:3 even when the rect is dragged off-image', () => {
    const clamped = clampCropTo43(
      { x: 1200, y: -50, width: 800, height: 600 },
      { width: 1600, height: 600 },
    );
    expect(clamped.width / clamped.height).toBeCloseTo(4 / 3, 6);
    expect(clamped.x).toBe(800); // 1600 - 800
    expect(clamped.y).toBe(0);
    expect(clamped.width).toBe(800);
    expect(clamped.height).toBe(600);
  });

  it('clampCropTo43 caps the rect at the largest 4:3 box that fits', () => {
    const clamped = clampCropTo43(
      { x: 0, y: 0, width: 5000, height: 3750 },
      { width: 1600, height: 600 },
    );
    // Width capped at maxCenteredCropTo43.width (=800), height derived from 4:3,
    // x/y stay where the input asked (0,0) — clampCropTo43 caps the size and
    // re-clamps the position, it does NOT auto-center.
    expect(clamped).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('cropToNormalized and normalizedToCrop round-trip', () => {
    const imageSize = { width: 1600, height: 600 };
    const original = { x: 400, y: 0, width: 800, height: 600 };
    const normalized = cropToNormalized(original, imageSize);
    expect(normalized).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
    const back = normalizedToCrop(normalized, imageSize);
    expect(back.x).toBeCloseTo(original.x, 9);
    expect(back.y).toBeCloseTo(original.y, 9);
    expect(back.width).toBeCloseTo(original.width, 9);
    expect(back.height).toBeCloseTo(original.height, 9);
  });
});
