import { describe, expect, it } from 'vitest';
import type { MemeTextField } from '../types';
import {
  DEFAULT_TEXT_STYLE,
  REFERENCE_IMAGE_HEIGHT,
  TEXT_FIELD_PADDING,
  TEXT_LINE_HEIGHT_RATIO,
  createEditableFields,
  getPreviewTextStyle,
  getTextContentBox,
  resolveSizeForImage,
  resolveTextStyle,
} from './textStyles';

const baseField: MemeTextField = {
  id: 'text_1',
  placeholder: 'Text 1',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  fontSize: 36,
  color: '#ffffff',
  align: 'center',
};

describe('createEditableFields', () => {
  it('lifts fontSize / color / align into styleOverrides so DEFAULT_TEXT_STYLE no longer wins', () => {
    const [editable] = createEditableFields([{ ...baseField, fontSize: 36, color: '#abcdef', align: 'left' }]);
    expect(editable.styleOverrides).toMatchObject({
      fontSize: 36,
      fontColor: '#abcdef',
      textAlign: 'left',
    });
  });

  it('promotes maxFontSize so it is at least as large as the persisted fontSize', () => {
    const [editable] = createEditableFields([{ ...baseField, fontSize: 120 }]);
    expect(editable.styleOverrides.maxFontSize).toBe(120);
  });

  it('lifts each optional style field into styleOverrides only when present', () => {
    const [editable] = createEditableFields([
      {
        ...baseField,
        bold: false,
        italic: true,
        fontFamily: 'Arial',
        uppercase: false,
        verticalAlign: 'top',
        effect: 'glow',
        outlineColor: '#ff00ff',
        outlineWidth: 4,
        opacity: 0.5,
      },
    ]);
    expect(editable.styleOverrides).toMatchObject({
      bold: false,
      italic: true,
      fontFamily: 'Arial',
      uppercase: false,
      verticalAlign: 'top',
      effect: 'glow',
      outlineColor: '#ff00ff',
      outlineWidth: 4,
      opacity: 0.5,
    });
  });

  it('omits keys for missing optional style fields so DEFAULT_TEXT_STYLE supplies them', () => {
    const [editable] = createEditableFields([baseField]);
    expect(editable.styleOverrides).not.toHaveProperty('bold');
    expect(editable.styleOverrides).not.toHaveProperty('italic');
    expect(editable.styleOverrides).not.toHaveProperty('fontFamily');
    expect(editable.styleOverrides).not.toHaveProperty('effect');
    const effective = resolveTextStyle(editable);
    expect(effective.bold).toBe(DEFAULT_TEXT_STYLE.bold);
    expect(effective.fontFamily).toBe(DEFAULT_TEXT_STYLE.fontFamily);
  });
});

describe('resolveSizeForImage', () => {
  it('returns the stored value unchanged on a reference-height image', () => {
    expect(resolveSizeForImage(48, REFERENCE_IMAGE_HEIGHT)).toBe(48);
  });

  it('scales linearly with image height — taller image, larger pixels', () => {
    expect(resolveSizeForImage(48, REFERENCE_IMAGE_HEIGHT * 2)).toBe(96);
    expect(resolveSizeForImage(48, REFERENCE_IMAGE_HEIGHT / 2)).toBe(24);
  });

  it('falls back to the input value when imageHeight is missing or non-positive', () => {
    expect(resolveSizeForImage(48, 0)).toBe(48);
    expect(resolveSizeForImage(48, -10)).toBe(48);
  });
});

describe('getTextContentBox', () => {
  it('uses the same scaled padding as the preview text box', () => {
    const box = getTextContentBox(487, 652, 1529);
    const padding = resolveSizeForImage(TEXT_FIELD_PADDING, 1529);

    expect(box.padding).toBe(padding);
    expect(box.width).toBe(487 - padding * 2);
    expect(box.height).toBe(652 - padding * 2);
  });
});

describe('getPreviewTextStyle', () => {
  it('produces the same CSS pixel font size for the same stored fontSize when the on-screen size is held constant', () => {
    // Same image displayed at 360 CSS pixels wide, but two different source resolutions.
    // 720x720 source @ previewScale 0.5 — 1px natural = 0.5 css px
    const small = getPreviewTextStyle(DEFAULT_TEXT_STYLE, 0.5, 720);
    // 1440x1440 source @ previewScale 0.25 — 1px natural = 0.25 css px
    const large = getPreviewTextStyle(DEFAULT_TEXT_STYLE, 0.25, 1440);
    expect(small.fontSize).toBe(large.fontSize);
  });

  it("does not let stored maxFontSize hard-cap the on-screen size on high-resolution images", () => {
    // The old renderer clamped at maxFontSize=75 px regardless of resolution. The new
    // semantic is that maxFontSize is also resolution-relative. Pick a stored fontSize
    // that exceeds DEFAULT_TEXT_STYLE.maxFontSize so we exercise the cap branch — at
    // 2x the reference height the effective cap should be 2x larger as well.
    const exceedsCap = { ...DEFAULT_TEXT_STYLE, fontSize: 200 };
    const taller = getPreviewTextStyle(exceedsCap, 1, REFERENCE_IMAGE_HEIGHT * 2);
    expect(taller.fontSize).toBe(`${DEFAULT_TEXT_STYLE.maxFontSize * 2}px`);
  });

  it('uses the shared text-box padding and line height constants', () => {
    const preview = getPreviewTextStyle(DEFAULT_TEXT_STYLE, 0.5, REFERENCE_IMAGE_HEIGHT * 2);

    expect(preview.lineHeight).toBe(TEXT_LINE_HEIGHT_RATIO);
    expect(preview.padding).toBe(`${TEXT_FIELD_PADDING}px`);
  });

  it('draws outline strokes behind the fill so they do not overlap the glyph body', () => {
    const outline = getPreviewTextStyle({ ...DEFAULT_TEXT_STYLE, effect: 'outline', outlineWidth: 3 }, 1, REFERENCE_IMAGE_HEIGHT);
    expect(outline.WebkitTextStroke).toBe('3px #000000');
    expect(outline.paintOrder).toBe('stroke fill');
  });
});
