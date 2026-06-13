import type { MemeTemplate } from '../types';

function resolveTemplateUrl(url: string) {
  if (!url.startsWith('/')) {
    return url;
  }

  return `${import.meta.env.BASE_URL}${url.slice(1)}`;
}

function isMemeTemplate(value: unknown): value is MemeTemplate {
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
        ['left', 'center', 'right'].includes(field.align)
      );
    })
  );
}

async function fetchTemplate(fileName: string): Promise<MemeTemplate | null> {
  const url = `${import.meta.env.BASE_URL}memes/${fileName}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.warn(`Failed to fetch meme template ${fileName}:`, err);
    return null;
  }

  if (!response.ok) {
    console.warn(`Skipped meme template ${fileName}: HTTP ${response.status}`);
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    console.warn(`Skipped meme template ${fileName}: invalid JSON`, err);
    return null;
  }

  if (!isMemeTemplate(data)) {
    console.warn(`Skipped invalid meme template: ${fileName}`);
    return null;
  }

  return { ...data, url: resolveTemplateUrl(data.url) };
}

/**
 * Discovers and loads all meme templates from `public/memes/`. The list is
 * driven by `public/memes/index.json`, generated at dev/build time by the
 * meme-manifest Vite plugin (see `vite-plugin-meme-manifest.ts`).
 *
 * To add a template: drop a PNG/JPG/SVG into `public/memes/` and a sibling
 * JSON next to it — the plugin updates the manifest on the next dev tick or
 * build. Invalid JSONs are warned to console and skipped, not thrown.
 */
export async function loadMemeTemplates(): Promise<MemeTemplate[]> {
  const manifestUrl = `${import.meta.env.BASE_URL}memes/index.json`;
  let manifestResponse: Response;
  try {
    manifestResponse = await fetch(manifestUrl);
  } catch (err) {
    console.warn('Failed to fetch meme manifest:', err);
    return [];
  }

  if (!manifestResponse.ok) {
    console.warn(`Failed to fetch meme manifest: HTTP ${manifestResponse.status}`);
    return [];
  }

  let fileNames: unknown;
  try {
    fileNames = await manifestResponse.json();
  } catch (err) {
    console.warn('Meme manifest is not valid JSON:', err);
    return [];
  }

  if (!Array.isArray(fileNames)) {
    console.warn('Meme manifest must be a JSON array of file names.');
    return [];
  }

  const templates = await Promise.all(
    fileNames
      .filter((name): name is string => typeof name === 'string')
      .map(fetchTemplate),
  );

  return templates
    .filter((template): template is MemeTemplate => template !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
