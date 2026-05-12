import { describe, it, expect } from 'vitest';
import { FONTS, resolveFontFamily, NERD_FAMILY } from './fonts.js';

describe('resolveFontFamily', () => {
  it('returns the bare family when nerd icons are off', () => {
    expect(resolveFontFamily('jetbrains-mono', false)).toBe(FONTS['jetbrains-mono'].family);
  });

  it('splices the Nerd Font in before ui-monospace when nerd icons are on', () => {
    const out = resolveFontFamily('jetbrains-mono', true);
    expect(out).toContain(NERD_FAMILY);
    // The nerd font must appear before ui-monospace so non-PUA glyphs
    // fall through correctly via the @font-face unicode-range filter.
    expect(out.indexOf(NERD_FAMILY)).toBeLessThan(out.indexOf('ui-monospace'));
  });

  it('falls back to JetBrains Mono for an unknown id', () => {
    expect(resolveFontFamily('does-not-exist', false)).toBe(FONTS['jetbrains-mono'].family);
  });
});
