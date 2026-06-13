import type { EditableTextField, MemeTextField, TextStyleSettings } from '../types';

export const DEFAULT_TEXT_STYLE: TextStyleSettings = {
  fontSize: 48,
  maxFontSize: 75,
  fontColor: '#ffffff',
  outlineColor: '#000000',
  fontFamily: 'Impact',
  uppercase: true,
  bold: true,
  italic: false,
  effect: 'shadow',
  outlineWidth: 1,
  textAlign: 'center',
  verticalAlign: 'middle',
  opacity: 1,
};

export function createEditableFields(textFields: MemeTextField[]): EditableTextField[] {
  return textFields.map((field, index) => ({
    id: field.id,
    text: field.placeholder,
    placeholder: field.placeholder,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    rotation: field.rotation ?? 0,
    zIndex: index + 1,
    styleOverrides: {
      fontSize: field.fontSize,
      maxFontSize: Math.max(field.fontSize, DEFAULT_TEXT_STYLE.maxFontSize),
      fontColor: field.color || DEFAULT_TEXT_STYLE.fontColor,
      textAlign: field.align,
    },
  }));
}

export function createNewEditableField(index: number, imageWidth: number, imageHeight: number): EditableTextField {
  const width = Math.min(320, Math.max(180, imageWidth * 0.4));
  const height = Math.min(120, Math.max(80, imageHeight * 0.16));

  return {
    id: `custom_${Date.now()}_${index}`,
    text: `Text #${index}`,
    placeholder: `Text #${index}`,
    x: Math.max(0, imageWidth / 2 - width / 2),
    y: Math.max(0, imageHeight / 2 - height / 2),
    width,
    height,
    rotation: 0,
    zIndex: index,
    styleOverrides: {},
  };
}

export function resolveTextStyle(field: EditableTextField): TextStyleSettings {
  return {
    ...DEFAULT_TEXT_STYLE,
    ...field.styleOverrides,
  };
}

export function getCanvasFont(style: TextStyleSettings, fontSize = style.fontSize) {
  const parts = [];

  if (style.italic) {
    parts.push('italic');
  }

  parts.push(style.bold ? '900' : '400');
  parts.push(`${fontSize}px`);
  parts.push(style.fontFamily);

  return parts.join(' ');
}
