export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type TextEffect = 'outline' | 'shadow' | 'glow' | 'none';

export interface MemeTextField {
  id: string;
  placeholder: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  align: TextAlign;
  /** Clockwise rotation in degrees, applied around the box center. Optional, defaults to 0. */
  rotation?: number;
  // Optional style fields — all default to DEFAULT_TEXT_STYLE when missing. Authors
  // can override any of these per-field in the template configurator; only deviations
  // from the default are persisted to keep template JSON minimal.
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  verticalAlign?: VerticalAlign;
  effect?: TextEffect;
  outlineColor?: string;
  outlineWidth?: number;
  opacity?: number;
  maxFontSize?: number;
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  tags: string[];
  /**
   * Optional crop rectangle for the Gallery card thumbnail, in 0..1 normalized
   * image coordinates. When omitted, the card falls back to `object-fit: cover`
   * (centered crop). Always 4:3 by construction.
   */
  thumbnail?: MemeThumbnailCrop;
  textFields: MemeTextField[];
}

export interface MemeThumbnailCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextStyleSettings {
  fontSize: number;
  maxFontSize: number;
  fontColor: string;
  outlineColor: string;
  fontFamily: string;
  uppercase: boolean;
  bold: boolean;
  italic: boolean;
  effect: TextEffect;
  outlineWidth: number;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  opacity: number;
}

export type TextStyleOverrides = Partial<TextStyleSettings>;

export interface EditableTextField {
  id: string;
  text: string;
  placeholder: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees applied around the box center. */
  rotation: number;
  zIndex: number;
  styleOverrides: TextStyleOverrides;
}

export type TextValues = Record<string, string>;

export interface TextStyleOptions {
  fontSize: number;
  color: string;
  fontFamily: string;
  uppercase: boolean;
}
