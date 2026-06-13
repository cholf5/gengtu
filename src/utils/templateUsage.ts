import type { MemeTemplate } from '../types';

export type SortMode = 'alphabetical' | 'frequency';

export interface TemplateUsage {
  /** Times the user has opened this template in the editor. */
  count: number;
  /** Last opened timestamp in ms since epoch — tiebreaker between equally-used templates. */
  lastUsed: number;
}

export type TemplateUsageMap = Record<string, TemplateUsage>;

const USAGE_KEY = 'open-meme:template-usage';
const SORT_KEY = 'open-meme:gallery-sort';

const SORT_MODES: readonly SortMode[] = ['alphabetical', 'frequency'];

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Some browsers throw on access (e.g. third-party cookies blocked iframe).
    return null;
  }
}

function readJSON<T>(key: string): T | null {
  const storage = safeLocalStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw == null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / storage disabled — silently drop, the data is non-critical.
  }
}

function isUsageEntry(value: unknown): value is TemplateUsage {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<TemplateUsage>;
  return typeof entry.count === 'number' && typeof entry.lastUsed === 'number';
}

export function getTemplateUsage(): TemplateUsageMap {
  const raw = readJSON<unknown>(USAGE_KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const result: TemplateUsageMap = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (typeof id === 'string' && id && isUsageEntry(entry)) {
      result[id] = { count: entry.count, lastUsed: entry.lastUsed };
    }
  }
  return result;
}

/**
 * Increment the open-count for a template and stamp `lastUsed` to "now". Returns
 * the updated map so callers can re-sort without re-reading storage.
 */
export function recordTemplateUsage(templateId: string, now: number = Date.now()): TemplateUsageMap {
  const id = templateId.trim();
  if (!id) return getTemplateUsage();

  const current = getTemplateUsage();
  const previous = current[id] ?? { count: 0, lastUsed: 0 };
  const next: TemplateUsageMap = {
    ...current,
    [id]: { count: previous.count + 1, lastUsed: now },
  };
  writeJSON(USAGE_KEY, next);
  return next;
}

export function getSortMode(): SortMode {
  const raw = readJSON<unknown>(SORT_KEY);
  return typeof raw === 'string' && (SORT_MODES as readonly string[]).includes(raw) ? (raw as SortMode) : 'alphabetical';
}

export function setSortMode(mode: SortMode): void {
  writeJSON(SORT_KEY, mode);
}

/**
 * Sort templates according to the requested mode without mutating the input.
 *
 * - `alphabetical`: case-insensitive name compare.
 * - `frequency`: usage count desc → lastUsed desc → name asc. Templates the user
 *   has never opened all share `count: 0, lastUsed: 0`, so they fall through to
 *   the alphabetical tail — which keeps fresh installs identical to the old default.
 */
export function sortTemplates(
  templates: MemeTemplate[],
  mode: SortMode,
  usage: TemplateUsageMap,
): MemeTemplate[] {
  const copy = [...templates];

  if (mode === 'frequency') {
    copy.sort((a, b) => {
      const ua = usage[a.id] ?? { count: 0, lastUsed: 0 };
      const ub = usage[b.id] ?? { count: 0, lastUsed: 0 };
      if (ub.count !== ua.count) return ub.count - ua.count;
      if (ub.lastUsed !== ua.lastUsed) return ub.lastUsed - ua.lastUsed;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }

  copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy;
}
