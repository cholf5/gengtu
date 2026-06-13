import type { EditableTextField, MemeTemplate, MemeTextField, MemeThumbnailCrop, TextStyleSettings } from '../types';
import { clampBoxToImage, roundRect, type Size } from './geometry';
import { DEFAULT_TEXT_STYLE, resolveTextStyle } from './textStyles';

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

const DUPLICATE_OFFSET = 16;

/**
 * Duplicate a text box: same geometry / style / rotation as the source, offset by a few
 * natural-image pixels so the copy is visibly distinct, clamped inside the image, and
 * stacked above every existing field. The new id / placeholder follow the same
 * `text_N` / `Text N` convention as freshly added fields — N is the next unused index
 * across `allFields`, so duplicating is indistinguishable from "Add text box" id-wise.
 */
export function duplicateTextField(
  source: EditableTextField,
  allFields: EditableTextField[],
  imageSize: Size,
): EditableTextField {
  const nextIndex = getNextTextFieldIndex(allFields);
  const id = `text_${nextIndex}`;
  const placeholder = `Text ${nextIndex}`;
  const maxZ = allFields.reduce((max, field) => Math.max(max, field.zIndex), 0);
  const offset = clampBoxToImage(
    {
      x: source.x + DUPLICATE_OFFSET,
      y: source.y + DUPLICATE_OFFSET,
      width: source.width,
      height: source.height,
    },
    imageSize,
    { minWidth: 1, minHeight: 1 },
  );

  return {
    ...source,
    id,
    placeholder,
    text: placeholder,
    x: offset.x,
    y: offset.y,
    width: offset.width,
    height: offset.height,
    zIndex: maxZ + 1,
    styleOverrides: { ...source.styleOverrides },
  };
}

export function buildTemplateJson(
  draft: TemplateDraft,
  fields: EditableTextField[],
  thumbnail?: MemeThumbnailCrop,
): MemeTemplate {
  // Order matters: JSON.stringify uses insertion order, and we want the
  // serialized shape to read id → name → url → tags → thumbnail → textFields.
  const template: MemeTemplate = {
    id: draft.id.trim(),
    name: draft.name.trim(),
    url: draft.url.trim(),
    tags: parseTags(draft.tagsInput),
    ...(thumbnail ? { thumbnail: roundThumbnailCrop(thumbnail) } : {}),
    textFields: fields.map((field) => {
      const rect = roundRect(field);
      const fieldId = field.id.trim();
      const rotation = Math.round(field.rotation ?? 0);
      const effective = resolveTextStyle(field);
      return {
        id: fieldId,
        placeholder: field.placeholder.trim() || fieldId,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        ...serializeFieldStyle(effective),
        // Only persist rotation when it deviates from the default — keeps existing
        // template JSONs byte-for-byte unchanged when re-exported untouched.
        ...(rotation !== 0 ? { rotation } : {}),
      };
    }),
  };
  return template;
}

/**
 * Round a normalized 0..1 thumbnail crop to 4 decimals. Avoids endless
 * trailing decimals in JSON like `0.30000000000000004`, while still keeping
 * sub-pixel precision on every realistic image (≥ 10000 px wide).
 */
function roundThumbnailCrop(crop: MemeThumbnailCrop): MemeThumbnailCrop {
  const round = (value: number) => Math.round(value * 10000) / 10000;
  return {
    x: round(crop.x),
    y: round(crop.y),
    width: round(crop.width),
    height: round(crop.height),
  };
}

/**
 * Serialize a field's effective style for template JSON.
 *
 * - `fontSize / color / align` are always emitted (back-compat — every existing
 *   template JSON carries them; readers/old tools may rely on their presence).
 * - Every other `TextStyleSettings` key is emitted only when it deviates from
 *   `DEFAULT_TEXT_STYLE`, so default-only fields stay JSON-clean.
 */
function serializeFieldStyle(effective: TextStyleSettings): Pick<MemeTextField, 'fontSize' | 'color' | 'align'> & Partial<MemeTextField> {
  const persisted: Pick<MemeTextField, 'fontSize' | 'color' | 'align'> = {
    fontSize: effective.fontSize,
    color: effective.fontColor,
    align: effective.textAlign,
  };
  const optional: Partial<MemeTextField> = {};
  if (effective.fontFamily !== DEFAULT_TEXT_STYLE.fontFamily) optional.fontFamily = effective.fontFamily;
  if (effective.bold !== DEFAULT_TEXT_STYLE.bold) optional.bold = effective.bold;
  if (effective.italic !== DEFAULT_TEXT_STYLE.italic) optional.italic = effective.italic;
  if (effective.uppercase !== DEFAULT_TEXT_STYLE.uppercase) optional.uppercase = effective.uppercase;
  if (effective.verticalAlign !== DEFAULT_TEXT_STYLE.verticalAlign) optional.verticalAlign = effective.verticalAlign;
  if (effective.effect !== DEFAULT_TEXT_STYLE.effect) optional.effect = effective.effect;
  if (effective.outlineColor !== DEFAULT_TEXT_STYLE.outlineColor) optional.outlineColor = effective.outlineColor;
  if (effective.outlineWidth !== DEFAULT_TEXT_STYLE.outlineWidth) optional.outlineWidth = effective.outlineWidth;
  if (effective.opacity !== DEFAULT_TEXT_STYLE.opacity) optional.opacity = effective.opacity;
  if (effective.maxFontSize !== DEFAULT_TEXT_STYLE.maxFontSize) optional.maxFontSize = effective.maxFontSize;
  return { ...persisted, ...optional };
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
