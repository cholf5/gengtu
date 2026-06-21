import { describe, expect, it } from 'vitest';
import { computeWatermarkLayout } from './watermark';

describe('computeWatermarkLayout', () => {
  it.each([
    { width: 800, height: 500 },
    { width: 1200, height: 1000 },
    { width: 2400, height: 2000 },
  ])('keeps fontSize at 1.8% of imageHeight ($width x $height)', ({ width, height }) => {
    const layout = computeWatermarkLayout(width, height);
    expect(layout.fontSize).toBeCloseTo(height * 0.018);
  });

  it.each([
    { width: 800, height: 500 },
    { width: 1200, height: 1000 },
    { width: 2400, height: 2000 },
  ])('keeps padding at 1.5% of imageHeight ($width x $height)', ({ width, height }) => {
    const layout = computeWatermarkLayout(width, height);
    expect(layout.padding).toBeCloseTo(height * 0.015);
  });

  it('right-aligns the watermark with `padding` from the right edge', () => {
    const width = 1200;
    const height = 1000;
    const layout = computeWatermarkLayout(width, height);
    expect(layout.rightX).toBeCloseTo(width - layout.padding);
  });

  it('places the text vertical center one (padding + fontSize/2) above bottom edge by default', () => {
    const width = 1200;
    const height = 1000;
    const layout = computeWatermarkLayout(width, height);
    expect(layout.centerY + layout.padding + layout.fontSize / 2).toBeCloseTo(height);
  });

  it('can place the text vertical center one (padding + fontSize/2) below top edge', () => {
    const width = 1200;
    const height = 1000;
    const layout = computeWatermarkLayout(width, height, 'top-right');
    expect(layout.centerY).toBeCloseTo(layout.padding + layout.fontSize / 2);
  });

  it('keeps shadowBlur at 0.15% of imageHeight', () => {
    const layout = computeWatermarkLayout(1200, 1000);
    expect(layout.shadowBlur).toBeCloseTo(1000 * 0.0015);
  });

  it('keeps shadowOffset at 0.1% of imageHeight', () => {
    const layout = computeWatermarkLayout(1200, 1000);
    expect(layout.shadowOffset).toBeCloseTo(1000 * 0.001);
  });

  it('produces finite, positive geometry on small images', () => {
    const layout = computeWatermarkLayout(300, 200);
    for (const value of Object.values(layout)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(layout.fontSize).toBeGreaterThan(0);
    expect(layout.padding).toBeGreaterThan(0);
    expect(layout.centerY).toBeGreaterThan(0);
    expect(layout.rightX).toBeGreaterThan(0);
  });
});
