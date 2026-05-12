// Tweaks panel — three expressive controls that reshape the feel of the
// studio. Native DOM (no React) to fit the rest of the codebase. Wires
// up the __activate/__deactivate/__edit_mode_available protocol so the
// host toolbar can toggle it; persists user choices through the
// EDITMODE-BEGIN/END JSON block in index.html.

import { app } from './app.js';
import { px } from './dom.js';

interface AccentDef {
  name: string;
  accent: string;
  soft: string;
  dim: string;
  ink: string;
}

interface DensityDef {
  name: string;
  fontBase: number;
  sidebarW: number;
  gap: number;
  padMain: string;
  cardHeader: number;
  headerLine: string;
}

interface SurfaceDef {
  name: string;
}

interface TweakState {
  accent: string;
  density: string;
  surface: string;
}

// Accents are not just "primary color" — each one carries a coordinated
// soft tone (for borders/dim chrome) and ink (the contrast color used
// on top of the accent). Switching accents flips every chrome detail
// at once: the mark, all hover states, modeline, focus rings, "live"
// dot, even the editor cursor and Monaco theme tokens.
const ACCENTS: Record<string, AccentDef> = {
  chartreuse: {
    name: 'Chartreuse',
    accent: '#c8f432',
    soft: '#a8d016',
    dim: '#4b6010',
    ink: '#0c1300',
  },
  amber: { name: 'Amber', accent: '#ffb000', soft: '#cc8c00', dim: '#553a00', ink: '#1a0f00' },
  cyan: { name: 'Cyan', accent: '#5ffdff', soft: '#3dcdd0', dim: '#0e4a4c', ink: '#001416' },
  magenta: { name: 'Magenta', accent: '#ff5fdf', soft: '#cc3eb0', dim: '#591f4d', ink: '#1a0014' },
  rose: { name: 'Rose', accent: '#ff708e', soft: '#cc5a72', dim: '#5a1f2d', ink: '#1a0008' },
  ice: { name: 'Ice', accent: '#a6d4ff', soft: '#7eb2e0', dim: '#2a4865', ink: '#020a14' },
};

// Density is a holistic scale — type, padding, sidebar width, gaps all
// move together. Compact reads as "operator console at 3am, 1000 lines
// of TS"; spacious reads as "design review, big screen, room of people."
const DENSITY: Record<string, DensityDef> = {
  compact: {
    name: 'Compact',
    fontBase: 11.5,
    sidebarW: 264,
    gap: 18,
    padMain: '16px 22px 80px',
    cardHeader: 32,
    headerLine: '34px',
  },
  normal: {
    name: 'Normal',
    fontBase: 12.5,
    sidebarW: 300,
    gap: 26,
    padMain: '20px 26px 80px',
    cardHeader: 36,
    headerLine: '36px',
  },
  spacious: {
    name: 'Spacious',
    fontBase: 14,
    sidebarW: 340,
    gap: 38,
    padMain: '28px 36px 100px',
    cardHeader: 42,
    headerLine: '42px',
  },
};

// Surface is atmosphere. Flat strips everything out — no grid, no glow,
// no animated dot — for "this is a serious tool, stop showing off."
// Phosphor is the default — subtle glow on accent, blueprint grid.
// Scanlines layers a CRT scanline pattern over the entire app, plus a
// soft vignette — feels like an old terminal photographed at 24fps.
const SURFACE: Record<string, SurfaceDef> = {
  flat: { name: 'Flat' },
  phosphor: { name: 'Phosphor' },
  scanlines: { name: 'Scanlines' },
};

declare global {
  interface Window {
    TWEAK_DEFAULTS?: Partial<TweakState>;
  }
}

interface PanelApi {
  root: HTMLDivElement;
  onChange: ((edits: Partial<TweakState>) => void) | null;
  onDismiss: (() => void) | null;
  dragReset: () => void;
}

export function setupTweaks(): void {
  const panel = buildPanel();
  document.body.appendChild(panel.root);
  panel.root.style.display = 'none';

  // listener BEFORE we announce availability
  window.addEventListener('message', (ev: MessageEvent<unknown>) => {
    if (typeof ev.data !== 'object' || ev.data === null) return;
    const t = (ev.data as { type?: unknown }).type;
    if (t === '__activate_edit_mode') {
      panel.root.style.display = 'block';
      panel.dragReset();
    } else if (t === '__deactivate_edit_mode') {
      panel.root.style.display = 'none';
    }
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');

  // initial apply from defaults already baked into index.html
  apply(window.TWEAK_DEFAULTS ?? {});

  panel.onChange = (next): void => {
    apply(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*');
  };
  panel.onDismiss = (): void => {
    panel.root.style.display = 'none';
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };
}

function apply(state: Partial<TweakState>): void {
  const accentId = state.accent ?? 'chartreuse';
  const densityId = state.density ?? 'normal';
  const surfaceId = state.surface ?? 'phosphor';

  // ACCENTS and DENSITY have static keys; the fallbacks are guaranteed to exist.
  const a = ACCENTS[accentId] ?? ACCENTS['chartreuse'];
  const d = DENSITY[densityId] ?? DENSITY['normal'];
  if (!a || !d) throw new Error('tweaks: missing default accent/density');

  const root = document.documentElement;
  root.style.setProperty('--accent', a.accent);
  root.style.setProperty('--accent-soft', a.soft);
  root.style.setProperty('--accent-dim', a.dim);
  root.style.setProperty('--accent-ink', a.ink);

  // density: cascade through the variables that pin layout to type
  document.body.style.fontSize = px(d.fontBase);
  root.style.setProperty('--sidebar-w', px(d.sidebarW));
  root.style.setProperty('--card-gap', px(d.gap));
  root.style.setProperty('--main-pad', d.padMain);
  root.style.setProperty('--card-header-h', px(d.cardHeader));

  document.body.classList.remove('surface-flat', 'surface-phosphor', 'surface-scanlines');
  document.body.classList.add('surface-' + (surfaceId in SURFACE ? surfaceId : 'phosphor'));

  document.body.classList.remove(
    'accent-chartreuse',
    'accent-amber',
    'accent-cyan',
    'accent-magenta',
    'accent-rose',
    'accent-ice',
  );
  document.body.classList.add('accent-' + (accentId in ACCENTS ? accentId : 'chartreuse'));

  // tell the app some chrome moved so xterm can re-measure on density change
  app.applyTerminalOptionsToAll();
}

function buildPanel(): PanelApi {
  const state: TweakState = {
    accent: 'chartreuse',
    density: 'normal',
    surface: 'phosphor',
    ...(window.TWEAK_DEFAULTS ?? {}),
  };

  const root = document.createElement('div');
  root.className = 'tweaks-panel';
  root.innerHTML = `
    <header class="tp-head">
      <span class="tp-grip"></span>
      <span class="tp-title">Tweaks</span>
      <span class="tp-sub">3 expressive knobs</span>
      <button class="tp-close" aria-label="close">×</button>
    </header>
    <div class="tp-body">
      <section class="tp-sec" data-sec="accent">
        <header class="tp-sec-h"><span class="tp-sec-num">01</span><span class="tp-sec-lbl">Accent</span><span class="tp-sec-meta" data-meta="accent"></span></header>
        <div class="tp-swatches" id="tp-accent"></div>
      </section>
      <section class="tp-sec" data-sec="density">
        <header class="tp-sec-h"><span class="tp-sec-num">02</span><span class="tp-sec-lbl">Density</span><span class="tp-sec-meta" data-meta="density"></span></header>
        <div class="tp-seg" id="tp-density"></div>
      </section>
      <section class="tp-sec" data-sec="surface">
        <header class="tp-sec-h"><span class="tp-sec-num">03</span><span class="tp-sec-lbl">Surface</span><span class="tp-sec-meta" data-meta="surface"></span></header>
        <div class="tp-seg" id="tp-surface"></div>
        <p class="tp-note">scanlines is a heavy atmosphere — use on stage.</p>
      </section>
    </div>
  `;

  const accentHost = root.querySelector<HTMLDivElement>('#tp-accent');
  if (!accentHost) throw new Error('tweaks panel: #tp-accent missing');
  for (const [id, a] of Object.entries(ACCENTS)) {
    const sw = document.createElement('button');
    sw.className = 'tp-swatch';
    sw.dataset['id'] = id;
    sw.title = a.name;
    sw.innerHTML =
      '<span class="tp-sw-dot" style="background:' +
      a.accent +
      '"></span><span class="tp-sw-lbl">' +
      a.name +
      '</span>';
    sw.addEventListener('click', () => {
      state.accent = id;
      renderActive();
      api.onChange?.({ accent: id });
    });
    accentHost.appendChild(sw);
  }

  const seg = (
    hostId: string,
    opts: Record<string, { name: string }>,
    key: keyof TweakState,
  ): void => {
    const host = root.querySelector<HTMLDivElement>(hostId);
    if (!host) throw new Error(`tweaks panel: ${hostId} missing`);
    for (const [id, o] of Object.entries(opts)) {
      const b = document.createElement('button');
      b.className = 'tp-seg-btn';
      b.dataset['id'] = id;
      b.textContent = o.name;
      b.addEventListener('click', () => {
        state[key] = id;
        renderActive();
        api.onChange?.({ [key]: id });
      });
      host.appendChild(b);
    }
  };
  seg('#tp-density', DENSITY, 'density');
  seg('#tp-surface', SURFACE, 'surface');

  function renderActive(): void {
    const setMeta = (sel: string, txt: string): void => {
      const e = root.querySelector(sel);
      if (e) e.textContent = txt;
    };
    setMeta('[data-meta="accent"]', ACCENTS[state.accent]?.name ?? '');
    setMeta('[data-meta="density"]', DENSITY[state.density]?.name ?? '');
    setMeta('[data-meta="surface"]', SURFACE[state.surface]?.name ?? '');
    root.querySelectorAll<HTMLElement>('#tp-accent .tp-swatch').forEach((e) => {
      e.classList.toggle('on', e.dataset['id'] === state.accent);
    });
    root.querySelectorAll<HTMLElement>('#tp-density .tp-seg-btn').forEach((e) => {
      e.classList.toggle('on', e.dataset['id'] === state.density);
    });
    root.querySelectorAll<HTMLElement>('#tp-surface .tp-seg-btn').forEach((e) => {
      e.classList.toggle('on', e.dataset['id'] === state.surface);
    });
  }
  renderActive();

  // close
  root.querySelector('.tp-close')?.addEventListener('click', () => {
    api.onDismiss?.();
  });

  // drag
  const head = root.querySelector<HTMLDivElement>('.tp-head');
  if (!head) throw new Error('tweaks panel: .tp-head missing');
  let drag: { dx: number; dy: number } | null = null;
  head.addEventListener('mousedown', (e: MouseEvent) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.classList.contains('tp-close')) return;
    const r = root.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!drag) return;
    root.style.left = px(e.clientX - drag.dx);
    root.style.top = px(e.clientY - drag.dy);
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => {
    drag = null;
  });

  const api: PanelApi = {
    root,
    onChange: null,
    onDismiss: null,
    dragReset() {
      /* keep position */
    },
  };
  return api;
}
