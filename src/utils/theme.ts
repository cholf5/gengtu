import { useEffect, useState } from 'react';

/**
 * Theme mode the user has chosen. `auto` defers to the OS via
 * `prefers-color-scheme`; `light` / `dark` force a side regardless.
 */
export type ThemeMode = 'auto' | 'light' | 'dark';

/** Concrete resolved theme actually applied to the page. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'gengtu:theme-mode';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  } catch {
    // ignored — privacy mode / disabled storage falls back to auto.
  }
  return 'auto';
}

export function setStoredThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignored
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(mode: ThemeMode, system: ResolvedTheme): ResolvedTheme {
  return mode === 'auto' ? system : mode;
}

/**
 * Drives the page's resolved theme. Writes `data-theme` on `<html>` so CSS
 * variables can flip, and exposes `mode / setMode` for the toggle button.
 *
 * The system listener stays attached even when mode !== 'auto' so flipping
 * back to 'auto' sees an up-to-date value without a remount.
 */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [system, setSystem] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_QUERY);
    const handler = (event: MediaQueryListEvent) => setSystem(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolved = resolveTheme(mode, system);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setMode = (next: ThemeMode) => {
    setStoredThemeMode(next);
    setModeState(next);
  };

  return { mode, resolved, setMode };
}
