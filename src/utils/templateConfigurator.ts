import type { EditableTextField, MemeTemplate } from '../types';
import { roundRect } from './geometry';

export interface TemplateDraft {
  id: string;
  name: string;
  url: string;
  tagsInput: string;
}

export function parseTags(tagsInput: string) {
  return tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function getNextTextFieldIndex(fields: Pick<EditableTextField, 'id'>[]) {
  const usedIndexes = new Set(
    fields
      .map((field) => /^text_(\d+)$/.exec(field.id.trim())?.[1])
      .filter((index): index is string => Boolean(index))
      .map((index) => Number(index)),
  );

  let index = 1;
  while (usedIndexes.has(index)) {
    index += 1;
  }

  return index;
}

export function createConfiguratorTextField(index: number, imageWidth: number, imageHeight: number): EditableTextField {
  const width = Math.round(imageWidth * 0.6);
  const height = Math.round(imageHeight * 0.16);

  return {
    id: `text_${index}`,
    text: `Text ${index}`,
    placeholder: `Text ${index}`,
    x: Math.round(imageWidth / 2 - width / 2),
    y: Math.round(imageHeight / 2 - height / 2),
    width,
    height,
    zIndex: index,
    styleOverrides: {},
  };
}

export function buildTemplateJson(draft: TemplateDraft, fields: EditableTextField[]): MemeTemplate {
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    url: draft.url.trim(),
    tags: parseTags(draft.tagsInput),
    textFields: fields.map((field) => {
      const rect = roundRect(field);
      const fieldId = field.id.trim();
      return {
        id: fieldId,
        placeholder: field.placeholder.trim() || fieldId,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontSize: 36,
        color: '#ffffff',
        align: 'center',
      };
    }),
  };
}

export function stringifyTemplateJson(template: MemeTemplate) {
  return `${JSON.stringify(template, null, 2)}\n`;
}
