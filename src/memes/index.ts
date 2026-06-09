import type { MemeTemplate } from '../types';

const modules = import.meta.glob('./*.json', { eager: true, import: 'default' });

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

export const memeTemplates = Object.entries(modules)
  .map(([path, template]) => {
    if (!isMemeTemplate(template)) {
      console.warn(`Skipped invalid meme template: ${path}`);
      return null;
    }

    return {
      ...template,
      url: resolveTemplateUrl(template.url),
    };
  })
  .filter((template): template is MemeTemplate => template !== null)
  .sort((a, b) => a.name.localeCompare(b.name));
