import type { CSSProperties } from 'react';
import type { EditableTextField, MemeTextField, TextStyleOverrides, TextStyleSettings, VerticalAlign } from '../types';

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
  return textFields.map((field, index) => {
    const overrides: TextStyleOverrides = {
      fontSize: field.fontSize,
      maxFontSize: Math.max(field.fontSize, field.maxFontSize ?? DEFAULT_TEXT_STYLE.maxFontSize),
      fontColor: field.color || DEFAULT_TEXT_STYLE.fontColor,
      textAlign: field.align,
    };

    // Lift each optional style — only when the JSON carries it — into styleOverrides
    // so authors land on the value the template was saved with, not DEFAULT_TEXT_STYLE.
    if (field.fontFamily !== undefined) overrides.fontFamily = field.fontFamily;
    if (field.bold !== undefined) overrides.bold = field.bold;
    if (field.italic !== undefined) overrides.italic = field.italic;
    if (field.uppercase !== undefined) overrides.uppercase = field.uppercase;
    if (field.verticalAlign !== undefined) overrides.verticalAlign = field.verticalAlign;
    if (field.effect !== undefined) overrides.effect = field.effect;
    if (field.outlineColor !== undefined) overrides.outlineColor = field.outlineColor;
    if (field.outlineWidth !== undefined) overrides.outlineWidth = field.outlineWidth;
    if (field.opacity !== undefined) overrides.opacity = field.opacity;

    return {
      id: field.id,
      text: field.placeholder,
      placeholder: field.placeholder,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      rotation: field.rotation ?? 0,
      zIndex: index + 1,
      styleOverrides: overrides,
    };
  });
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

/**
 * CSS preview style for an editable text field. Mirrors the canvas renderer
 * (see `src/utils/canvas.ts`) — outline becomes WebKit text-stroke, shadow becomes
 * a single drop-shadow scaled with `outlineWidth`, glow becomes layered text-shadows.
 *
 * The MemeEditor and TemplateConfigurator both render previews through this helper
 * so the configurator's preview matches what the user will see when they later open
 * the saved template in the editor.
 */
export function getPreviewTextStyle(style: TextStyleSettings, scale: number): CSSProperties {
  const strokeWidth = Math.max(0, style.outlineWidth * scale);
  const previewFontSize = Math.min(style.fontSize, style.maxFontSize);
  const glowBlur = Math.max(8, style.outlineWidth * 4) * scale;
  const glowShadow =
    style.effect === 'glow'
      ? Array.from({ length: 3 }, () => `0 0 ${glowBlur}px ${style.outlineColor}`).join(', ')
      : null;
  const dropShadow =
    style.effect === 'shadow'
      ? `${strokeWidth || 3}px ${strokeWidth || 3}px ${Math.max(4, strokeWidth * 2)}px ${style.outlineColor}`
      : null;

  return {
    fontSize: `${previewFontSize * scale}px`,
    color: style.fontColor,
    fontFamily: style.fontFamily,
    fontWeight: style.bold ? 900 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    justifyContent: style.textAlign === 'left' ? 'flex-start' : style.textAlign === 'right' ? 'flex-end' : 'center',
    opacity: style.opacity,
    textAlign: style.textAlign,
    WebkitTextStroke: style.effect === 'outline' ? `${strokeWidth}px ${style.outlineColor}` : undefined,
    textShadow: glowShadow ?? dropShadow ?? undefined,
  };
}

export function getPreviewText(text: string, style: TextStyleSettings) {
  return style.uppercase ? text.toUpperCase() : text;
}

export function getVerticalAlignClass(verticalAlign: VerticalAlign) {
  if (verticalAlign === 'top') {
    return 'align-top';
  }

  if (verticalAlign === 'bottom') {
    return 'align-bottom';
  }

  return 'align-middle';
}
