import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('returns the explicit mode when not auto', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('falls through to the system theme when auto', () => {
    expect(resolveTheme('auto', 'light')).toBe('light');
    expect(resolveTheme('auto', 'dark')).toBe('dark');
  });
});
