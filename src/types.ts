export type TextAlign = 'left' | 'center' | 'right';

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
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  tags: string[];
  textFields: MemeTextField[];
}

export interface TextStyleOptions {
  fontSize: number;
  color: string;
  fontFamily: string;
  uppercase: boolean;
}

export type TextValues = Record<string, string>;
