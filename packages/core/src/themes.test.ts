import { describe, it, expect } from 'vitest';
import { THEMES, getTheme, themesByVariant, ANSI_NAMES } from './themes.js';

describe('THEMES registry', () => {
  it('every theme exposes the full ANSI-16 palette', () => {
    for (const [id, t] of Object.entries(THEMES)) {
      for (const name of ANSI_NAMES) {
        expect(t.ansi[name], `${id}.ansi.${name}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
  it('every theme has a hex background, foreground, and cursor', () => {
    for (const [id, t] of Object.entries(THEMES)) {
      expect(t.background, `${id}.background`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.foreground, `${id}.foreground`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.cursor, `${id}.cursor`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('every theme is tagged dark or light', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.variant === 'dark' || t.variant === 'light').toBe(true);
    }
  });
});

describe('getTheme', () => {
  it('returns the requested theme by id', () => {
    expect(getTheme('dracula').name).toBe('Dracula');
  });
  it('falls back to tokyo-night for an unknown id', () => {
    expect(getTheme('does-not-exist').name).toBe('Tokyo Night');
  });
});

describe('themesByVariant', () => {
  it('groups themes by their variant tag', () => {
    const dark = themesByVariant('dark');
    const light = themesByVariant('light');
    expect(dark.every(([, t]) => t.variant === 'dark')).toBe(true);
    expect(light.every(([, t]) => t.variant === 'light')).toBe(true);
    // Sanity: the two groups should partition the registry.
    expect(dark.length + light.length).toBe(Object.keys(THEMES).length);
  });
});
