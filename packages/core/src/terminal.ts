// Heuristic Nerd Font support detection for terminal environments.
//
// There is no reliable terminal-capability query for "do you have a
// Nerd Font installed and configured" — terminals report colour depth,
// Unicode width, hyperlinks, etc., but font installation is host-OS
// state the terminal itself doesn't know about. So we do what every
// other "fancy CLI" tool does: honour an explicit override first, then
// fall back to an allow-list of terminals where installing a Nerd Font
// is the community convention.
//
// This module is pure — no `process`, no `globalThis`. Callers pass the
// signals they have (Node's `process.env` + `process.stdout.isTTY`,
// Deno's `Deno.env.toObject()` + `Deno.stdout.isTerminal()`, Bun's
// equivalents, …) and we return a boolean. Mock the inputs to test.

/**
 * Signals the caller is willing to expose about its environment.
 * Pass whatever you have; everything is optional.
 */
export interface NerdFontDetectionSignals {
  /** Process environment variables (e.g. Node's `process.env`). */
  env?: Readonly<Record<string, string | undefined>>;
  /** Whether stdout is a TTY. `false` short-circuits to `false`. */
  isTTY?: boolean;
}

/**
 * Names of env vars whose value (`1` / `0` / `true` / `false`) forces
 * a specific answer regardless of any heuristic. Listed in priority
 * order — the first set value wins.
 */
const OVERRIDE_KEYS = ['TUICRAFT_NERD_FONT', 'NERD_FONT', 'NERDFONT'] as const;

/**
 * Terminals whose users overwhelmingly configure a Nerd Font as their
 * default. Detected via env vars that the terminal sets itself.
 *
 * Notable omissions: macOS Terminal.app (varies), VS Code's integrated
 * terminal (varies), Windows Terminal (modern but no built-in font),
 * iTerm2 (varies). Users on those terminals can opt in via the
 * override env vars above.
 */
const NERD_LIKELY_ENV_KEYS = [
  // kitty sets this on every spawn
  'KITTY_WINDOW_ID',
  // WezTerm sets one of these
  'WEZTERM_PANE',
  'WEZTERM_EXECUTABLE',
  // Alacritty 0.13+
  'ALACRITTY_SOCKET',
] as const;

const NERD_LIKELY_TERM_PROGRAMS = new Set(['WezTerm', 'ghostty']);

function readOverride(env: Readonly<Record<string, string | undefined>>): boolean | null {
  for (const key of OVERRIDE_KEYS) {
    const raw = env[key];
    if (raw === undefined) continue;
    const v = raw.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
    if (v === '0' || v === 'false' || v === 'no' || v === 'off' || v === '') return false;
  }
  return null;
}

/**
 * Best-effort detection of whether the calling environment can render
 * Nerd Font icon glyphs.
 *
 * The result drives the `<icon>` intrinsic in {@link renderTreeToAnsi}:
 * when `true`, `<icon nerd="" fallback="✓" />` emits the Nerd
 * codepoint; when `false`, the fallback.
 *
 * Decision order:
 *
 * 1. `TUICRAFT_NERD_FONT`, `NERD_FONT`, `NERDFONT` env vars are honoured
 *    as explicit overrides (truthy → `true`, falsy → `false`).
 * 2. If `isTTY` is explicitly `false`, return `false` — no point emitting
 *    PUA codepoints into a pipe / file.
 * 3. If the env identifies a terminal that conventionally ships with a
 *    Nerd Font configured (kitty, WezTerm, Alacritty, ghostty), return
 *    `true`.
 * 4. Otherwise return `false` — the safe default. Users on iTerm2,
 *    Terminal.app, VS Code terminal, Windows Terminal, etc. opt in via
 *    the override env var if they've installed a patched font.
 *
 * Always honour `--nerd-fonts` / `--no-nerd-fonts` CLI flags in your
 * own app on top of this — explicit user intent beats any heuristic.
 *
 * @example
 * ```ts
 * import { renderTreeToAnsi, hasNerdFontSupport, getTheme } from '@tuicraft/core';
 * const nerdIcons = hasNerdFontSupport(\{
 *   env: process.env,
 *   isTTY: process.stdout.isTTY,
 * \});
 * process.stdout.write(renderTreeToAnsi(tree, \{
 *   theme: getTheme('tokyo-night'),
 *   derivedMap: \{\},
 *   nerdIcons,
 * \}));
 * ```
 */
export function hasNerdFontSupport(signals: NerdFontDetectionSignals = {}): boolean {
  const env = signals.env ?? {};

  const override = readOverride(env);
  if (override !== null) return override;

  if (signals.isTTY === false) return false;

  for (const key of NERD_LIKELY_ENV_KEYS) {
    if (env[key]) return true;
  }
  const termProgram = env['TERM_PROGRAM'];
  if (termProgram !== undefined && NERD_LIKELY_TERM_PROGRAMS.has(termProgram)) return true;

  return false;
}
