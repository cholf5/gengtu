import { describe, expect, it } from 'vitest';
import { computeWatermarkLayout } from './watermark';

describe('computeWatermarkLayout', () => {
  // Use a fixed mock textWidth — the computation is independent of how the
  // text actually measures; we just need the geometry to be consistent.
  const TEXT_WIDTH = 100;

  it.each([
    { width: 800, height: 500 },
    { width: 1200, height: 1000 },
    { width: 2400, height: 2000 },
  ])('keeps watermark height at 3.5% of imageHeight ($width x $height)', ({ width, height }) => {
    const layout = computeWatermarkLayout(width, height, TEXT_WIDTH);
    expect(layout.height).toBeCloseTo(height * 0.035);
    expect(layout.logoSize).toBeCloseTo(height * 0.035);
  });

  it.each([
    { width: 800, height: 500 },
    { width: 1200, height: 1000 },
    { width: 2400, height: 2000 },
  ])('keeps padding at 2% of imageHeight ($width x $height)', ({ width, height }) => {
    const layout = computeWatermarkLayout(width, height, TEXT_WIDTH);
    expect(layout.padding).toBeCloseTo(height * 0.02);
  });

  it('hugs the bottom-right corner with the configured padding', () => {
    const width = 1200;
    const height = 1000;
    const layout = computeWatermarkLayout(width, height, TEXT_WIDTH);
    // right edge of watermark group + padding === image width
    expect(layout.x + layout.totalWidth + layout.padding).toBeCloseTo(width);
    // bottom edge of watermark group + padding === image height
    expect(layout.y + layout.height + layout.padding).toBeCloseTo(height);
  });

  it('preserves font / gap / shadow ratios relative to height', () => {
    const layout = computeWatermarkLayout(1200, 1000, TEXT_WIDTH);
    expect(layout.fontSize).toBeCloseTo(layout.height * 0.85);
    expect(layout.gap).toBeCloseTo(layout.height * 0.35);
    expect(layout.shadowBlur).toBeCloseTo(1000 * 0.004);
  });

  it('totalWidth = logo + gap + textWidth', () => {
    const layout = computeWatermarkLayout(1200, 1000, TEXT_WIDTH);
    expect(layout.totalWidth).toBeCloseTo(layout.logoSize + layout.gap + TEXT_WIDTH);
  });

  it('produces finite, positive geometry on small images', () => {
    const layout = computeWatermarkLayout(300, 200, TEXT_WIDTH);
    for (const value of Object.values(layout)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.padding).toBeGreaterThan(0);
    expect(layout.fontSize).toBeGreaterThan(0);
    expect(layout.logoSize).toBeGreaterThan(0);
  });
});
