// Default seed workspace shown to first-time visitors. Three components
// of increasing complexity: a status banner (categorical styling), a
// progress line (derived palette + ANSI), and a git statusline (Nerd
// Font icons + powerline glyphs).

import type { WorkspaceState } from './state.js';
import { nextId } from './persist.js';

export const SEED_COMPONENT_1 = `// A component is one TSX file: a contract (TS interface), a render
// function, and a list of states. The previews on the right re-render
// live. Mouse over <fg color="..."> for color autocompletion.

interface StatusBannerProps {
  kind: 'success' | 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
}

const KIND = {
  success: { glyph: '\\u2713', color: 'green'  as Color },
  error:   { glyph: '\\u2717', color: 'red'    as Color },
  warning: { glyph: '!',      color: 'yellow' as Color },
  info:    { glyph: 'i',      color: 'blue'   as Color },
};

export default defineComponent<StatusBannerProps>({
  name: 'StatusBanner',
  render: (p) => {
    const k = KIND[p.kind];
    return (
      <>
        <line>
          <fg color={k.color}><bold>{k.glyph}</bold></fg>
          <span>  {p.message}</span>
        </line>
        {p.detail && (
          <line>
            <fg color="$muted">     {p.detail}</fg>
          </line>
        )}
      </>
    );
  },
  states: [
    { name: 'success', data: { kind: 'success', message: 'Deploy complete', detail: '2 services updated in 14.2s' } },
    { name: 'error',   data: { kind: 'error',   message: 'Build failed',    detail: 'src/api.ts(42,7): type error' } },
    { name: 'warning', data: { kind: 'warning', message: 'Slow build',      detail: 'completed in 47s (target: 20s)' } },
    { name: 'info',    data: { kind: 'info',    message: 'Cache hit ratio 87%' } },
  ],
});
`;

export const SEED_COMPONENT_2 = `interface ProgressLineProps {
  label: string;
  current: number;
  total: number;
  width?: number;
}

export default defineComponent<ProgressLineProps>({
  name: 'ProgressLine',
  render: (p) => {
    const width = p.width ?? 24;
    const ratio = Math.max(0, Math.min(1, p.current / p.total));
    const filled = Math.round(ratio * width);
    const pct = Math.round(ratio * 100).toString().padStart(3, ' ');
    return (
      <line>
        <fg color="$muted">{p.label.padEnd(14)}</fg>
        <fg color="brightBlack">[</fg>
        <fg color="cyan">{'\\u2588'.repeat(filled)}</fg>
        <fg color="$track">{'\\u2588'.repeat(width - filled)}</fg>
        <fg color="brightBlack">]</fg>
        <span>  </span>
        <fg color="brightWhite"><bold>{pct}%</bold></fg>
        <fg color="$muted"> {p.current}/{p.total}</fg>
      </line>
    );
  },
  states: [
    { name: 'starting',  data: { label: 'compile',  current: 3,   total: 142 } },
    { name: 'midway',    data: { label: 'compile',  current: 84,  total: 142 } },
    { name: 'finishing', data: { label: 'compile',  current: 138, total: 142 } },
    { name: 'done',      data: { label: 'compile',  current: 142, total: 142 } },
  ],
});
`;

// Third seed: a git statusline that uses Nerd Font glyphs and powerline
// separators. This is what the "nerd icons" toggle is designed to show
// off — toggle it off and the glyphs fall back to tofu / blanks, which
// is exactly the failure mode designers should be able to inspect.
export const SEED_COMPONENT_3 = `// Uses Nerd Font icons (\\uf126 git branch, \\uf06a issue, etc) and powerline
// separators (\\ue0b0). Toggle "nerd icons" in the sidebar to see the
// fallback behavior on a system without a patched font installed.

interface GitStatuslineProps {
  branch: string;
  ahead: number;
  behind: number;
  dirty: number;
  ci: 'passing' | 'failing' | 'pending';
}

// <icon nerd="…" fallback="…" /> picks the Nerd codepoint when the
// active workspace has Nerd Font icons enabled and the ASCII fallback
// otherwise. Toggle "Nerd Font icons" in the sidebar to flip the seed
// component live. In a real terminal, hasNerdFontSupport(...) drives
// the same nerdIcons flag on the render context.
const CI = {
  passing: { nerd: '\\uf058', fallback: '✓', color: 'green'  as Color, label: 'passing' },
  failing: { nerd: '\\uf057', fallback: '✗', color: 'red'    as Color, label: 'failing' },
  pending: { nerd: '\\uf017', fallback: '·', color: 'yellow' as Color, label: 'pending' },
};

export default defineComponent<GitStatuslineProps>({
  name: 'GitStatusline',
  render: (p) => {
    const ci = CI[p.ci];
    return (
      <line>
        <bg color="blue"><fg color="brightWhite">
          <bold>   {p.branch}  </bold>
        </fg></bg>
        <fg color="blue"><bg color="brightBlack"></bg></fg>
        <bg color="brightBlack"><fg color="brightWhite">
          <span>  </span>
          {p.ahead > 0 && <><fg color="green"> {p.ahead}</fg><span> </span></>}
          {p.behind > 0 && <><fg color="red"> {p.behind}</fg><span> </span></>}
          {p.dirty > 0 && <><fg color="yellow"> {p.dirty}</fg><span> </span></>}
          <span> </span>
        </fg></bg>
        <fg color="brightBlack"><bg color={ci.color}></bg></fg>
        <bg color={ci.color}><fg color="black">
          <bold>  <icon nerd={ci.nerd} fallback={ci.fallback} /> {ci.label}  </bold>
        </fg></bg>
        <fg color={ci.color}></fg>
      </line>
    );
  },
  states: [
    { name: 'clean',         data: { branch: 'main',          ahead: 0, behind: 0, dirty: 0, ci: 'passing' } },
    { name: 'ahead-of-main', data: { branch: 'feat/colors',   ahead: 3, behind: 0, dirty: 2, ci: 'pending' } },
    { name: 'broken',        data: { branch: 'fix/race-cond', ahead: 1, behind: 7, dirty: 4, ci: 'failing' } },
  ],
});
`;

export function makeSeedState(): WorkspaceState {
  return {
    themeId: 'tokyo-night',
    fontId: 'jetbrains-mono',
    fontSize: 13,
    nerdIcons: true,
    derived: [
      { id: nextId(), name: 'muted', base: 'white', dSat: -30, dLit: -25, alpha: 1 },
      { id: nextId(), name: 'subtle', base: 'white', dSat: -40, dLit: -45, alpha: 1 },
      { id: nextId(), name: 'track', base: 'brightBlack', dSat: 0, dLit: -15, alpha: 1 },
    ],
    components: [
      { id: nextId(), source: SEED_COMPONENT_1 },
      { id: nextId(), source: SEED_COMPONENT_2 },
      { id: nextId(), source: SEED_COMPONENT_3 },
    ],
  };
}
