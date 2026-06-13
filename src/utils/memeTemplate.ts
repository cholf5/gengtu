import type { MemeTemplate } from '../types';

/**
 * Runtime shape check for a parsed template object. Lives in utils so both the
 * manifest loader (`src/memes/index.ts`) and the import flow in
 * `TemplateConfigurator` can share a single source of truth — a drift between
 * the two would let the configurator accept JSON the gallery later rejects.
 *
 * Note: `thumbnail` is *not* validated here. The manifest loader runs a stricter
 * `validateThumbnail` (range / aspect ratio) of its own; importing a template
 * back into the editor doesn't need that strictness — out-of-range thumbnails
 * would be re-clamped by `clampCropTo43` once `imageSize` is known anyway.
 */
export function isMemeTemplate(value: unknown): value is MemeTemplate {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const template = value as Partial<MemeTemplate>;

  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.url === 'string' &&
    Array.isArray(template.tags) &&
    Array.isArray(template.textFields) &&
    template.textFields.every((field) => {
      return (
        field &&
        typeof field.id === 'string' &&
        typeof field.placeholder === 'string' &&
        typeof field.x === 'number' &&
        typeof field.y === 'number' &&
        typeof field.width === 'number' &&
        typeof field.height === 'number' &&
        typeof field.fontSize === 'number' &&
        typeof field.color === 'string' &&
        ['left', 'center', 'right'].includes(field.align) &&
        (field.rotation === undefined || typeof field.rotation === 'number')
      );
    })
  );
}
