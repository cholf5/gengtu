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

export interface DerivedTemplateDraft {
  id: string;
  name: string;
  url: string;
}

/**
 * Derive Template ID / Name / Image URL from an uploaded file's name.
 *
 * - `Distracted-Boyfriend.jpg` → id `Distracted-Boyfriend`, name `Distracted Boyfriend`, url `/memes/distracted-boyfriend.jpg`
 * - Whitespace and underscores collapse into a single `-` separator (preserving case).
 * - The image URL is fully lowercased so it matches conventional filesystem paths.
 */
export function deriveTemplateDraftFromFilename(filename: string): DerivedTemplateDraft {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1;
  const rawBase = hasExt ? trimmed.slice(0, lastDot) : trimmed;
  const ext = hasExt ? trimmed.slice(lastDot + 1).toLowerCase() : '';

  const id = rawBase
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const name = id.replace(/-/g, ' ');
  const url = id ? `/memes/${id.toLowerCase()}${ext ? `.${ext}` : ''}` : '';

  return { id, name, url };
}
