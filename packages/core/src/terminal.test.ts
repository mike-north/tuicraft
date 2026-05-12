/**
 * Tests for terminal-environment Nerd Font detection.
 *
 * The helper is pure (takes signals as input), so tests are just
 * tables of (env, isTTY) → expected boolean.
 */
import { describe, it, expect } from 'vitest';
import { hasNerdFontSupport } from './terminal.js';

describe('hasNerdFontSupport — explicit override', () => {
  it('returns true for NERD_FONT=1', () => {
    expect(hasNerdFontSupport({ env: { NERD_FONT: '1' } })).toBe(true);
  });
  it('returns false for NERD_FONT=0 even when the terminal looks favourable', () => {
    expect(
      hasNerdFontSupport({
        env: { NERD_FONT: '0', KITTY_WINDOW_ID: 'abc' },
        isTTY: true,
      }),
    ).toBe(false);
  });
  it('accepts true/false/yes/no/on/off (case-insensitive)', () => {
    for (const v of ['true', 'TRUE', 'yes', 'on']) {
      expect(hasNerdFontSupport({ env: { NERD_FONT: v } })).toBe(true);
    }
    for (const v of ['false', 'FALSE', 'no', 'off']) {
      expect(hasNerdFontSupport({ env: { NERD_FONT: v } })).toBe(false);
    }
  });
  it('treats an empty-string override as false (`NERD_FONT=`)', () => {
    expect(hasNerdFontSupport({ env: { NERD_FONT: '' } })).toBe(false);
  });
  it('lets TUICRAFT_NERD_FONT take priority over NERD_FONT', () => {
    expect(hasNerdFontSupport({ env: { TUICRAFT_NERD_FONT: '0', NERD_FONT: '1' } })).toBe(false);
  });
  it('lets NERD_FONT take priority over NERDFONT', () => {
    expect(hasNerdFontSupport({ env: { NERD_FONT: '0', NERDFONT: '1' } })).toBe(false);
  });
  it('ignores an unrecognized override value and falls through to the heuristic', () => {
    expect(hasNerdFontSupport({ env: { NERD_FONT: 'maybe', KITTY_WINDOW_ID: 'abc' } })).toBe(true);
  });
});

describe('hasNerdFontSupport — TTY gate', () => {
  it('returns false when isTTY is explicitly false, even for known terminals', () => {
    expect(hasNerdFontSupport({ env: { KITTY_WINDOW_ID: 'abc' }, isTTY: false })).toBe(false);
  });
  it('does not require isTTY to be set explicitly', () => {
    expect(hasNerdFontSupport({ env: { KITTY_WINDOW_ID: 'abc' } })).toBe(true);
  });
});

describe('hasNerdFontSupport — terminal heuristic', () => {
  it('detects kitty via KITTY_WINDOW_ID', () => {
    expect(hasNerdFontSupport({ env: { KITTY_WINDOW_ID: '1' } })).toBe(true);
  });
  it('detects WezTerm via WEZTERM_PANE', () => {
    expect(hasNerdFontSupport({ env: { WEZTERM_PANE: '0' } })).toBe(true);
  });
  it('detects WezTerm via TERM_PROGRAM', () => {
    expect(hasNerdFontSupport({ env: { TERM_PROGRAM: 'WezTerm' } })).toBe(true);
  });
  it('detects Alacritty via ALACRITTY_SOCKET', () => {
    expect(hasNerdFontSupport({ env: { ALACRITTY_SOCKET: '/tmp/alacritty.sock' } })).toBe(true);
  });
  it('detects ghostty via TERM_PROGRAM', () => {
    expect(hasNerdFontSupport({ env: { TERM_PROGRAM: 'ghostty' } })).toBe(true);
  });
});

describe('hasNerdFontSupport — conservative default', () => {
  it('returns false for an empty environment', () => {
    expect(hasNerdFontSupport({})).toBe(false);
  });
  it('returns false for no signals at all', () => {
    expect(hasNerdFontSupport()).toBe(false);
  });
  it('returns false for Terminal.app — installation varies', () => {
    expect(hasNerdFontSupport({ env: { TERM_PROGRAM: 'Apple_Terminal' } })).toBe(false);
  });
  it('returns false for VS Code terminal — installation varies', () => {
    expect(hasNerdFontSupport({ env: { TERM_PROGRAM: 'vscode' } })).toBe(false);
  });
  it('returns false for iTerm2 — installation varies', () => {
    expect(hasNerdFontSupport({ env: { TERM_PROGRAM: 'iTerm.app' } })).toBe(false);
  });
  it('returns false for Windows Terminal — no default Nerd Font', () => {
    expect(hasNerdFontSupport({ env: { WT_SESSION: 'abc' } })).toBe(false);
  });
});
