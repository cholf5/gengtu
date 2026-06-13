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
    rotation: 0,
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
      const rotation = Math.round(field.rotation ?? 0);
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
        // Only persist rotation when it deviates from the default — keeps existing
        // template JSONs byte-for-byte unchanged when re-exported untouched.
        ...(rotation !== 0 ? { rotation } : {}),
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
 * Derive Template ID / Name / Image URL from a free-form `Name` plus an optional
 * file extension (no leading dot needed).
 *
 * - id: whitespace and underscores collapse into a single `-`, case preserved
 * - url: `/memes/<lowercased-id>.<ext>`; the ext is omitted when empty
 */
export function deriveTemplateDraftFromName(name: string, ext = ''): DerivedTemplateDraft {
  const trimmedName = name.trim();
  const id = trimmedName
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanExt = ext.trim().toLowerCase().replace(/^\./, '');
  const url = id ? `/memes/${id.toLowerCase()}${cleanExt ? `.${cleanExt}` : ''}` : '';

  return { id, name: trimmedName, url };
}

/**
 * Derive Template ID / Name / Image URL from an uploaded file's name.
 *
 * - `Distracted-Boyfriend.jpg` → id `Distracted-Boyfriend`, name `Distracted Boyfriend`, url `/memes/distracted-boyfriend.jpg`
 * - `two-buttons.jpg` → name `Two Buttons` (each word title-cased even when the filename was lowercase)
 * - Whitespace / `_` / `-` in the filename are folded back to spaces for the human-facing Name.
 * - The image URL is fully lowercased so it matches conventional filesystem paths.
 */
export function deriveTemplateDraftFromFilename(filename: string): DerivedTemplateDraft {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1;
  const rawBase = hasExt ? trimmed.slice(0, lastDot) : trimmed;
  const ext = hasExt ? trimmed.slice(lastDot + 1) : '';

  const name = rawBase
    .replace(/[\s_-]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
  return deriveTemplateDraftFromName(name, ext);
}

/**
 * Extract the (lowercased, no-dot) extension from a filename, or `''` if there isn't one.
 */
export function extractFileExtension(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot <= 0 || lastDot >= trimmed.length - 1) {
    return '';
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}
