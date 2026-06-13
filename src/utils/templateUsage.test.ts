// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MemeTemplate } from '../types';
import {
  getSortMode,
  getTemplateUsage,
  recordTemplateUsage,
  setSortMode,
  sortTemplates,
} from './templateUsage';

function makeTemplate(id: string, name = id): MemeTemplate {
  return { id, name, url: `/memes/${id}.png`, tags: [], textFields: [] };
}

const templates: MemeTemplate[] = [
  makeTemplate('charlie', 'Charlie'),
  makeTemplate('alpha', 'Alpha'),
  makeTemplate('bravo', 'Bravo'),
];

// jsdom 29 dropped Storage; install a plain in-memory polyfill on `window`
// so the helpers, which read `window.localStorage` directly, have something
// to talk to during tests.
function installStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

describe('templateUsage', () => {
  beforeEach(installStorage);
  afterEach(() => window.localStorage.clear());

  it('defaults to alphabetical sort when nothing is stored', () => {
    expect(getSortMode()).toBe('alphabetical');
  });

  it('persists and reads back the sort mode', () => {
    setSortMode('frequency');
    expect(getSortMode()).toBe('frequency');
  });

  it('falls back to alphabetical for an unknown stored mode', () => {
    window.localStorage.setItem('open-meme:gallery-sort', JSON.stringify('lol'));
    expect(getSortMode()).toBe('alphabetical');
  });

  it('records usage by incrementing count and stamping lastUsed', () => {
    recordTemplateUsage('alpha', 1000);
    recordTemplateUsage('alpha', 2000);
    const usage = getTemplateUsage();
    expect(usage.alpha).toEqual({ count: 2, lastUsed: 2000 });
  });

  it('ignores corrupted usage payloads', () => {
    window.localStorage.setItem('open-meme:template-usage', '{"alpha": "nope"}');
    expect(getTemplateUsage()).toEqual({});
  });

  it('sorts alphabetically by name regardless of usage', () => {
    const usage = { charlie: { count: 99, lastUsed: 1 } };
    const sorted = sortTemplates(templates, 'alphabetical', usage);
    expect(sorted.map((t) => t.id)).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('sorts by usage count, with lastUsed as tiebreaker', () => {
    const usage = {
      alpha: { count: 1, lastUsed: 100 },
      bravo: { count: 3, lastUsed: 50 },
      charlie: { count: 3, lastUsed: 200 },
    };
    const sorted = sortTemplates(templates, 'frequency', usage);
    expect(sorted.map((t) => t.id)).toEqual(['charlie', 'bravo', 'alpha']);
  });

  it('falls through to alphabetical for never-used templates in frequency mode', () => {
    const usage = { bravo: { count: 1, lastUsed: 100 } };
    const sorted = sortTemplates(templates, 'frequency', usage);
    expect(sorted.map((t) => t.id)).toEqual(['bravo', 'alpha', 'charlie']);
  });

  it('does not mutate the caller-provided template list', () => {
    const input = [...templates];
    sortTemplates(input, 'alphabetical', {});
    expect(input.map((t) => t.id)).toEqual(['charlie', 'alpha', 'bravo']);
  });
});
