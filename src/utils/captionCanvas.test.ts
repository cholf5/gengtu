import { describe, expect, it } from 'vitest';
import type { TextStyleSettings } from '../types';
import {
  calculateCaptionBlockHeight,
  buildCaptionTextField,
  calculateCaptionCanvasSize,
  calculateCaptionOutputPixels,
  getCaptionLineCount,
  getDefaultCaptionStyle,
  MAX_CAPTION_LINES,
  parseCaptionLines,
} from './captionCanvas';

function makeStyle(overrides: Partial<TextStyleSettings> = {}): TextStyleSettings {
  return {
    ...getDefaultCaptionStyle(),
    ...overrides,
  };
}

describe('captionCanvas utilities', () => {
  it('parses non-empty trimmed lines and caps the result', () => {
    const text = ['  first  ', '', 'second', '   ', ...Array.from({ length: 30 }, (_, index) => `line ${index}`)].join('\n');

    const lines = parseCaptionLines(text);

    expect(lines).toHaveLength(MAX_CAPTION_LINES);
    expect(lines[0]).toBe('first');
    expect(lines[1]).toBe('second');
  });

  it('counts all effective lines before the cap', () => {
    expect(getCaptionLineCount('a\n\n b \n c')).toBe(3);
  });

  it('grows block height when font size grows', () => {
    const small = calculateCaptionBlockHeight(makeStyle({ fontSize: 36, maxFontSize: 36 }), 720);
    const large = calculateCaptionBlockHeight(makeStyle({ fontSize: 72, maxFontSize: 72 }), 720);

    expect(large).toBeGreaterThan(small);
  });

  it('adds one repeated block for each caption line after the first', () => {
    expect(calculateCaptionCanvasSize(640, 480, 0, 80)).toEqual({ width: 640, height: 480 });
    expect(calculateCaptionCanvasSize(640, 480, 1, 80)).toEqual({ width: 640, height: 480 });
    expect(calculateCaptionCanvasSize(640, 480, 3, 80)).toEqual({ width: 640, height: 640 });
  });

  it('uses the final output canvas size for pixel budget checks', () => {
    expect(calculateCaptionOutputPixels(640, 480, 3, 80)).toBe(640 * 640);
  });

  it('uses the source image height as the caption text padding scale', () => {
    const field = buildCaptionTextField('caption', 'hello', 480, 640, 720, 96, makeStyle());

    expect(field.x).toBe(48);
    expect(field.width).toBe(544);
  });
});
