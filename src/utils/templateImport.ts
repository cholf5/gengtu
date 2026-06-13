import type { EditableTextField, MemeTemplate, MemeThumbnailCrop } from '../types';
import { isMemeTemplate } from './memeTemplate';
import { extractFileExtension } from './templateConfigurator';
import { createEditableFields } from './textStyles';

/**
 * Parse a string as a `MemeTemplate`. Throws when the string is not valid JSON
 * or when the parsed value fails the runtime shape check. The caller is
 * expected to surface the thrown message via `message.error(...)` — the import
 * flow keeps the editor's existing state intact on failure.
 */
export function parseTemplateJson(text: string): MemeTemplate {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new Error(`JSON 不是合法的模板：${err instanceof Error ? err.message : '解析失败'}`);
  }

  if (!isMemeTemplate(value)) {
    throw new Error('JSON 不是合法的模板：缺少必要字段或字段类型不匹配。');
  }

  return value;
}

export interface ImportedTemplateDraft {
  /** Mirrors `DraftState` in `TemplateConfigurator.tsx` (kept structural to avoid a circular dep). */
  draft: {
    name: string;
    tagsInput: string;
    imageExt: string;
  };
  fields: EditableTextField[];
  /**
   * Normalized 0..1 thumbnail rect from the original JSON, deferred until
   * `imageSize` is known (the configurator has its own effect that turns this
   * back into natural pixels via `normalizedToCrop`).
   */
  pendingThumbnail: MemeThumbnailCrop | null;
}

/**
 * Lift a parsed template into the shapes `TemplateConfigurator` keeps in state.
 *
 * - `draft.name` is the original `template.name` (Template ID / URL re-derive
 *   from it via `deriveTemplateDraftFromName`, matching the new-template flow).
 * - `tagsInput` joins with `", "` so the input box reads back as the user typed it.
 * - `imageExt` is extracted from the original `url` so subsequent name edits keep
 *   the same extension on the derived URL.
 * - `fields` reuses `createEditableFields`, which lifts JSON style fields into
 *   `styleOverrides` and seeds `text` from the placeholder.
 * - `pendingThumbnail` is the raw normalized crop; the configurator turns it
 *   into a natural-pixel `Rect` once the image loads.
 */
export function buildImportedDraft(template: MemeTemplate): ImportedTemplateDraft {
  return {
    draft: {
      name: template.name,
      tagsInput: template.tags.join(', '),
      imageExt: extractFileExtension(template.url),
    },
    fields: createEditableFields(template.textFields),
    pendingThumbnail: template.thumbnail ?? null,
  };
}

/**
 * Resolve a template's `url` against `import.meta.env.BASE_URL` the same way
 * the manifest loader does. Exported separately so the configurator can fetch
 * the image without re-implementing the prefix logic.
 */
export function resolveTemplateImageUrl(url: string, baseUrl: string): string {
  if (!url.startsWith('/')) {
    return url;
  }
  return `${baseUrl}${url.slice(1)}`;
}
