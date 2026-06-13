import { describe, expect, it } from 'vitest';
import type { MemeTextField } from '../types';
import { DEFAULT_TEXT_STYLE, createEditableFields, resolveTextStyle } from './textStyles';

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
