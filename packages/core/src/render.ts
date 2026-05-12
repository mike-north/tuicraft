// Render a JSX tree to an ANSI byte stream that xterm.js can chew on.
//
// We maintain a stack of "style frames" (fg, bg, attrs). Each intrinsic
// pushes a frame, emits its content, and pops. Before any text is emitted
// we compute the effective style (folded over the stack), compare it to
// the last emitted style key, and if it changed, emit a single SGR
// reset + the new codes. This avoids spraying redundant escape sequences
// and matches how real terminals expect their input.
//
// Colors:
//   "red", "brightCyan" — ANSI-16 name → mapped to the active theme
//   "#f59e0b"           — true-color hex, emitted as 38;2;r;g;b
//   "$muted"            — derived color, looked up in ctx.derivedMap and
//                         resolved against the active theme (re-resolves
//                         when theme changes — that's the whole point)

import { ANSI_FG_CODE, ANSI_BG_CODE, type AnsiName, type Theme } from './themes.js';
import { hexToRgb, applyDerivation } from './color-math.js';
import { Fragment, isJSXElement, type JSXNode } from './jsx-runtime.js';
import type { DerivedColor } from './state.js';

export interface RenderContext {
  theme: Theme;
  /** Lookup by derived-color name (without the leading `$`). */
  derivedMap: Record<string, DerivedColor>;
  /**
   * Whether the active workspace declares Nerd Font icon glyphs as
   * available. Drives the `<icon nerd="…" fallback="…" />` intrinsic.
   * Defaults to `true` so existing render contexts don't have to
   * thread the flag through.
   */
  nerdIcons?: boolean;
}

type ResolvedColor = { kind: 'ansi'; value: AnsiName } | { kind: 'hex'; value: string } | null;

interface StyleFrame {
  fg?: ResolvedColor;
  bg?: ResolvedColor;
  attrs?: Set<number>;
}

function isAnsiName(s: string): s is AnsiName {
  return Object.prototype.hasOwnProperty.call(ANSI_FG_CODE, s);
}

function resolveColor(c: unknown, ctx: RenderContext): ResolvedColor {
  if (typeof c !== 'string' || c.length === 0) return null;
  if (c.startsWith('#')) return { kind: 'hex', value: c };
  if (c.startsWith('$')) {
    const name = c.slice(1);
    const d = ctx.derivedMap[name];
    if (!d) return null;
    const base = ctx.theme.ansi[d.base];
    const hex = applyDerivation(base, ctx.theme.background, d.dSat, d.dLit, d.alpha);
    return { kind: 'hex', value: hex };
  }
  if (isAnsiName(c)) return { kind: 'ansi', value: c };
  return null;
}

function fgSgr(c: ResolvedColor): string | null {
  if (!c) return null;
  if (c.kind === 'ansi') return String(ANSI_FG_CODE[c.value]);
  const [r, g, b] = hexToRgb(c.value);
  return `38;2;${String(r)};${String(g)};${String(b)}`;
}

function bgSgr(c: ResolvedColor): string | null {
  if (!c) return null;
  if (c.kind === 'ansi') return String(ANSI_BG_CODE[c.value]);
  const [r, g, b] = hexToRgb(c.value);
  return `48;2;${String(r)};${String(g)};${String(b)}`;
}

const INTRINSIC_ATTR: Record<string, number> = {
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  inverse: 7,
  strike: 9,
};

export function renderTreeToAnsi(tree: JSXNode, ctx: RenderContext): string {
  const out: string[] = [];
  const stack: StyleFrame[] = [];
  let lastKey: string | null = null;

  function effective(): { fg: ResolvedColor; bg: ResolvedColor; attrs: Set<number> } {
    const eff = { fg: null as ResolvedColor, bg: null as ResolvedColor, attrs: new Set<number>() };
    for (const f of stack) {
      if (f.fg !== undefined) eff.fg = f.fg;
      if (f.bg !== undefined) eff.bg = f.bg;
      if (f.attrs) for (const a of f.attrs) eff.attrs.add(a);
    }
    return eff;
  }
  function keyOf(eff: ReturnType<typeof effective>): string {
    return JSON.stringify({
      fg: eff.fg,
      bg: eff.bg,
      attrs: [...eff.attrs].sort((a, b) => a - b),
    });
  }
  function emitStyle(): void {
    const eff = effective();
    const k = keyOf(eff);
    if (k === lastKey) return;
    lastKey = k;
    const codes = ['0'];
    const f = fgSgr(eff.fg);
    if (f) codes.push(f);
    const b = bgSgr(eff.bg);
    if (b) codes.push(b);
    for (const a of eff.attrs) codes.push(String(a));
    out.push('\x1b[' + codes.join(';') + 'm');
  }
  function emitText(s: string): void {
    if (!s) return;
    emitStyle();
    out.push(s);
  }

  function walk(node: JSXNode): void {
    if (node == null || node === false || node === true) return;
    if (typeof node === 'string') {
      emitText(node);
      return;
    }
    if (typeof node === 'number') {
      emitText(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isJSXElement(node)) {
      // Defensive — JSXNode's union covers everything above, but a user
      // component might return an off-spec value at runtime (we eval the
      // component source dynamically post-Monaco-emit).
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      emitText(String(node));
      return;
    }

    if (node.tag === Fragment) {
      node.children.forEach(walk);
      return;
    }

    if (typeof node.tag === 'function') {
      const result = node.tag({ ...node.props, children: node.children });
      walk(result);
      return;
    }

    const t = node.tag;

    // <icon nerd="" fallback="✓" /> — leaf node, no children, no
    // styling of its own; emits one of the two strings depending on
    // whether the active workspace has Nerd Font icons enabled. The
    // user wraps it in <fg> / <bold> / etc. for colour and weight.
    if (t === 'icon') {
      const useNerd = ctx.nerdIcons !== false;
      const nerd = node.props['nerd'];
      const fallback = node.props['fallback'];
      const text =
        useNerd && typeof nerd === 'string' && nerd.length > 0
          ? nerd
          : typeof fallback === 'string'
            ? fallback
            : '';
      emitText(text);
      return;
    }

    const frame: StyleFrame = {};
    if (t === 'fg') frame.fg = resolveColor(node.props['color'], ctx);
    else if (t === 'bg') frame.bg = resolveColor(node.props['color'], ctx);
    else if (t in INTRINSIC_ATTR) {
      const code = INTRINSIC_ATTR[t];
      if (code !== undefined) frame.attrs = new Set<number>([code]);
    }

    const hasFrame = Object.keys(frame).length > 0;
    if (hasFrame) stack.push(frame);
    node.children.forEach(walk);
    if (hasFrame) stack.pop();

    if (t === 'line') {
      emitStyle();
      out.push('\r\n');
    }
  }

  walk(tree);
  out.push('\x1b[0m');
  return out.join('');
}
