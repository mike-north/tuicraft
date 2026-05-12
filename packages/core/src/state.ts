// The shared workspace-state model. Both the studio app and the URL-hash
// codec agree on this shape; the studio holds exactly one of these in
// memory at a time and rebuilds it from the URL on load.

import type { AnsiName } from './themes.js';

/** A user-defined color derived from an ANSI base. */
export interface DerivedColor {
  /** Stable identity for UI reconciliation (not persisted in URL). */
  id: string;
  /** Identifier used in TSX as `"$name"`. ASCII letters/digits/`_`/`-` only. */
  name: string;
  /** ANSI-16 base the derivation hangs off; re-resolves on theme switch. */
  base: AnsiName;
  /** Saturation delta in [-100, 100]. */
  dSat: number;
  /** Lightness delta in [-100, 100]. */
  dLit: number;
  /** Alpha-blend with the active theme's background, in [0, 1]. */
  alpha: number;
}

/** A single TSX component source the user is editing. */
export interface ComponentSource {
  /** Stable identity for UI reconciliation (not persisted in URL). */
  id: string;
  /** Raw TSX source. Compiled by Monaco at render time. */
  source: string;
}

/**
 * In-memory workspace state. The studio app holds exactly one of these
 * at a time; it is reconstructed from the URL hash on load and pushed
 * back to the URL on every mutation.
 */
export interface WorkspaceState {
  themeId: string;
  fontId: string;
  /** Editor preview font size in CSS pixels. */
  fontSize: number;
  /** Whether to layer in the Symbols Nerd Font for icon-glyph fallbacks. */
  nerdIcons: boolean;
  derived: DerivedColor[];
  components: ComponentSource[];
}

/**
 * URL-encoded form, schema version 1. Single-letter keys keep the URL
 * short — workspace state lives in `location.hash` and we don't want
 * to blow past the browser's URL-length limits with ten components.
 */
export interface SerializedWorkspaceV1 {
  v: 1;
  themeId: string;
  fontId: string;
  fontSize: number;
  /** 1 / 0 instead of true / false to save two characters per save. */
  nerdIcons: 0 | 1;
  derived: SerializedDerivedV1[];
  components: SerializedComponentV1[];
}

export interface SerializedDerivedV1 {
  /** name */ n: string;
  /** base */ b: AnsiName;
  /** dSat */ s: number;
  /** dLit */ l: number;
  /** alpha */ a: number;
}

export interface SerializedComponentV1 {
  /** source */ s: string;
}
