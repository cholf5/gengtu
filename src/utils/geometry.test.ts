import { describe, expect, it } from 'vitest';
import { clamp, clampBoxToImage, fromPreviewRect, roundRect, toPreviewRect } from './geometry';

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
