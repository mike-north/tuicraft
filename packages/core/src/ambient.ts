// Generates the ambient TypeScript declarations injected into Monaco.
//
// This is the magic that gives the editor real type-checking for our
// DSL — when the user writes <fg color="$muted">, the editor knows
// that "$muted" is a valid Color if and only if a derived color named
// "muted" has been defined in the sidebar.

/**
 * Build the ambient `.d.ts` source for a given set of derived-color names.
 *
 * The generated module declares:
 *   - `Color` — union of ANSI-16 names, hex strings, and the active set
 *     of derived names (`'$' + name`).
 *   - JSX intrinsics for `<fg>`, `<bg>`, `<bold>`, …, `<line>`, `<span>`.
 *   - `defineComponent<P>(...)` — the entry point user code calls.
 *
 * The output is plain text suitable for
 * `monaco.languages.typescript.typescriptDefaults.setExtraLibs(...)`.
 */
export function ambientLibSource(derivedNames: readonly string[]): string {
  const derivedUnion =
    derivedNames.length > 0 ? derivedNames.map((n) => "'$" + n + "'").join(' | ') : 'never';
  return `
declare type AnsiColor =
  | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white'
  | 'brightBlack' | 'brightRed' | 'brightGreen' | 'brightYellow'
  | 'brightBlue'  | 'brightMagenta' | 'brightCyan' | 'brightWhite';
declare type HexColor = \`#\${string}\`;
declare type DerivedColor = ${derivedUnion};
declare type Color = AnsiColor | HexColor | DerivedColor | (string & {});

declare namespace JSX {
  interface Element { __k: true; tag: any; props: any; children: any[]; }
  interface ElementClass { render: any; }
  interface IntrinsicElements {
    fg:        { color: Color; children?: any };
    bg:        { color: Color; children?: any };
    bold:      { children?: any };
    dim:       { children?: any };
    italic:    { children?: any };
    underline: { children?: any };
    inverse:   { children?: any };
    strike:    { children?: any };
    /** Wraps content followed by a newline. */
    line:      { children?: any };
    /** No-op grouping element. */
    span:      { children?: any };
    /**
     * Semantic icon. Emits \`nerd\` when the workspace's Nerd Font toggle
     * is on; otherwise emits \`fallback\` (typically a regular Unicode
     * glyph or short ASCII). Wrap in \`<fg>\`, \`<bold>\`, etc. for styling.
     *
     * @example
     *   <icon nerd="\\uf058" fallback="✓" />
     */
    icon: { nerd: string; fallback?: string };
  }
}

declare function h(tag: any, props: any, ...children: any[]): JSX.Element;
declare const Fragment: any;

interface ComponentState<P> { name: string; data: P; }
interface ComponentDef<P> {
  name: string;
  render: (props: P) => any;
  states: ComponentState<P>[];
}
declare function defineComponent<P>(def: ComponentDef<P>): ComponentDef<P>;
`;
}
