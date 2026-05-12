// Terminal font registry. Each entry is a Google-Fonts-loaded monospace
// stack; the Nerd-Font toggle adds 'Symbols Nerd Font Mono' as a fallback
// so PUA icon codepoints render with terminal-style ligated symbols.
// The Symbols Nerd Font is loaded via @font-face with a unicode-range
// filter so it only kicks in for icon codepoints.

export interface Font {
  name: string;
  family: string;
  /** Short string shown in the font picker so each face is visually distinct. */
  sample: string;
}

export const FONTS = {
  'jetbrains-mono': {
    name: 'JetBrains Mono',
    family: '"JetBrains Mono", ui-monospace, monospace',
    sample: 'aA→★λ',
  },
  'fira-code': {
    name: 'Fira Code',
    family: '"Fira Code", ui-monospace, monospace',
    sample: '!=≠→λ',
  },
  'ibm-plex-mono': {
    name: 'IBM Plex Mono',
    family: '"IBM Plex Mono", ui-monospace, monospace',
    sample: 'aA→★λ',
  },
  'source-code-pro': {
    name: 'Source Code Pro',
    family: '"Source Code Pro", ui-monospace, monospace',
    sample: 'aA→★λ',
  },
  inconsolata: {
    name: 'Inconsolata',
    family: '"Inconsolata", ui-monospace, monospace',
    sample: 'aA→★λ',
  },
  'space-mono': {
    name: 'Space Mono',
    family: '"Space Mono", ui-monospace, monospace',
    sample: 'aA→★λ',
  },
} as const satisfies Record<string, Font>;

export type FontId = keyof typeof FONTS;

export const DEFAULT_FONT_ID: FontId = 'jetbrains-mono';

export const NERD_FAMILY = '"Symbols Nerd Font Mono"';

/**
 * Resolve a font id + nerd-icons flag to a final CSS `font-family` string.
 *
 * When nerd icons are on we splice the Symbols Nerd Font in *before*
 * `ui-monospace`, so glyphs in the icon PUA range fall through to it
 * via the \@font-face unicode-range filter while everything else uses
 * the chosen base font.
 */
export function resolveFontFamily(fontId: string, nerdIcons: boolean): string {
  const f = (FONTS as Record<string, Font>)[fontId] ?? FONTS[DEFAULT_FONT_ID];
  if (!nerdIcons) return f.family;
  return f.family.replace('ui-monospace', NERD_FAMILY + ', ui-monospace');
}
