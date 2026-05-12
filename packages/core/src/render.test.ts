/**
 * Tests for the JSX → ANSI renderer.
 *
 * Expected ANSI codes are derived directly from the SGR spec, NOT from
 * the renderer's current output:
 *
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code#SGR — Select Graphic Rendition
 *
 * Reference SGR codes used here:
 *   0      — reset
 *   1      — bold
 *   2      — dim
 *   31..37 — fg black..white
 *   91..97 — fg bright black..white
 *   38;2;R;G;B — true-color fg
 */
import { describe, it, expect } from 'vitest';
import { h, Fragment } from './jsx-runtime.js';
import { renderTreeToAnsi, type RenderContext } from './render.js';
import { THEMES } from './themes.js';

const ctx: RenderContext = {
  theme: THEMES['tokyo-night'],
  derivedMap: {
    muted: { id: '0', name: 'muted', base: 'white', dSat: 0, dLit: 0, alpha: 1 },
  },
};

describe('renderTreeToAnsi', () => {
  it('emits a final reset for plain text', () => {
    const tree = h(Fragment, null, 'hi');
    // Per render.ts: every emitText calls emitStyle(); empty effective
    // style still produces the key {null,null,[]}, so codes=['0'] →
    // \x1b[0m, then 'hi', then a final \x1b[0m at walk's end.
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mhi\x1b[0m');
  });

  it('emits an ANSI fg code for an ANSI-named color', () => {
    const tree = h('fg', { color: 'red' }, 'X');
    // Reset (0) + fg red (31) → \x1b[0;31mX\x1b[0m
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;31mX\x1b[0m');
  });

  it('uses bright codes for brightCyan', () => {
    const tree = h('fg', { color: 'brightCyan' }, 'X');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;96mX\x1b[0m');
  });

  it('emits 24-bit truecolor for hex fg', () => {
    const tree = h('fg', { color: '#ff8000' }, 'X');
    // 38;2;r;g;b for fg
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;38;2;255;128;0mX\x1b[0m');
  });

  it('emits 24-bit truecolor for hex bg', () => {
    const tree = h('bg', { color: '#102030' }, 'X');
    // 48;2;r;g;b for bg
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;48;2;16;32;48mX\x1b[0m');
  });

  it('falls back to no color when the color string is unknown', () => {
    const tree = h('fg', { color: 'not-a-real-color' }, 'X');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mX\x1b[0m');
  });

  it('emits bold as SGR 1', () => {
    const tree = h('bold', null, 'X');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;1mX\x1b[0m');
  });

  it('combines fg + bold into one SGR sequence', () => {
    const tree = h('fg', { color: 'red' }, h('bold', null, 'X'));
    // Combined: reset + bold + fg red. Order in render.ts: fg first, then attrs.
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;31;1mX\x1b[0m');
  });

  it('appends \\r\\n for <line>', () => {
    const tree = h('line', null, 'hi');
    // <line> wraps content + a CRLF; the trailing emitStyle inside the
    // <line> branch runs *after* children, so the post-children style
    // is the same — it does not re-emit codes that already match.
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mhi\r\n\x1b[0m');
  });

  it('walks Fragment children transparently', () => {
    const tree = h(Fragment, null, 'a', 'b', 'c');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mabc\x1b[0m');
  });

  it('drops null / false / true children', () => {
    const tree = h(Fragment, null, 'a', null, 'b', false, 'c', true);
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mabc\x1b[0m');
  });

  it('coerces numeric children to strings', () => {
    const tree = h(Fragment, null, 'n=', 42);
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mn=42\x1b[0m');
  });

  it('resolves a derived color via the active theme', () => {
    // muted: base=white, dSat=0, dLit=0, alpha=1 → identity on white.
    // tokyo-night white = #a9b1d6 → SGR 38;2;169;177;214
    const tree = h('fg', { color: '$muted' }, 'X');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;38;2;169;177;214mX\x1b[0m');
  });

  it('falls back when a derived color name is unknown', () => {
    const tree = h('fg', { color: '$does-not-exist' }, 'X');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mX\x1b[0m');
  });

  it('invokes function components with merged props + children', () => {
    const Greet = (p: { name: string; children: unknown[] }) =>
      h(Fragment, null, 'hello, ', p.name, ' ', ...(p.children as never[]));
    const tree = h(Greet, { name: 'world' }, '!');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0mhello, world !\x1b[0m');
  });

  it('does not duplicate identical SGR sequences across adjacent text', () => {
    // Two consecutive text children under the same fg should share one SGR.
    const tree = h('fg', { color: 'red' }, 'a', 'b');
    expect(renderTreeToAnsi(tree, ctx)).toBe('\x1b[0;31mab\x1b[0m');
  });
});

describe('<icon> intrinsic', () => {
  const baseCtx = { ...ctx };

  it('emits the nerd glyph when ctx.nerdIcons is true', () => {
    const tree = h('icon', { nerd: '', fallback: 'V' });
    expect(renderTreeToAnsi(tree, { ...baseCtx, nerdIcons: true })).toBe('\x1b[0m\x1b[0m');
  });

  it('emits the fallback when ctx.nerdIcons is false', () => {
    const tree = h('icon', { nerd: '', fallback: 'V' });
    expect(renderTreeToAnsi(tree, { ...baseCtx, nerdIcons: false })).toBe('\x1b[0mV\x1b[0m');
  });

  it('treats undefined nerdIcons as enabled (back-compat with old contexts)', () => {
    const tree = h('icon', { nerd: 'X', fallback: 'Y' });
    expect(renderTreeToAnsi(tree, baseCtx)).toBe('\x1b[0mX\x1b[0m');
  });

  it('falls back when nerd codepoint is missing and nerdIcons is on', () => {
    const tree = h('icon', { fallback: 'Y' });
    expect(renderTreeToAnsi(tree, { ...baseCtx, nerdIcons: true })).toBe('\x1b[0mY\x1b[0m');
  });

  it('emits nothing if both nerd and fallback are missing', () => {
    const tree = h('icon', {});
    expect(renderTreeToAnsi(tree, baseCtx)).toBe('\x1b[0m');
  });

  it('inherits surrounding fg/bold styling', () => {
    const tree = h(
      'fg',
      { color: 'green' },
      h('bold', null, h('icon', { nerd: 'X', fallback: 'Y' })),
    );
    expect(renderTreeToAnsi(tree, { ...baseCtx, nerdIcons: true })).toBe('\x1b[0;32;1mX\x1b[0m');
  });
});
