// The application object. Owns global state (theme, fonts, derived
// palette, components), wires up the sidebar UI, drives Monaco load,
// and orchestrates persistence to the URL hash. Every change updates
// the URL within ~500ms so the receiver of a "share URL" gets the
// exact session.

import {
  THEMES,
  THEME_VARIANTS,
  ANSI_NAMES,
  themesByVariant,
  getTheme,
  FONTS,
  applyDerivation,
  encodeStateToHash,
  decodeStateFromHash,
  makeSeedState,
  nextId,
  type Theme,
  type AnsiName,
  type Font,
  type WorkspaceState,
  type DerivedColor,
  type RenderContext,
} from '@tuicraft/core';
import { loadMonaco, setAmbientLib, type Monaco } from './monaco-loader.js';
import { ComponentInstance } from './component-instance.js';
import { $, $maybe, $as, $asMaybe, setText, el, px, pad2 } from './dom.js';

const NEW_COMPONENT_TEMPLATE = `// new component
interface Props {
  text: string;
}

export default defineComponent<Props>({
  name: 'NewComponent',
  render: (p) => (
    <line>
      <fg color="cyan"><bold>→</bold></fg> {p.text}
    </line>
  ),
  states: [
    { name: 'default', data: { text: 'hello, world' } },
  ],
});
`;

class AppImpl {
  // Non-null after init() resolves. The ! markers reflect that contract.
  state!: WorkspaceState;
  monaco!: Monaco;
  components: ComponentInstance[] = [];
  derivedMap: Record<string, DerivedColor> = {};

  // Stage mode (presentation view).
  stageActive = false;
  stageIndex = 0;
  stageStateIndex = 0;
  stageFontSize = 20;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // ----- toast -----
  toast(msg: string, ms = 1400): void {
    const e = $('toast');
    e.textContent = msg;
    e.classList.add('show');
    if (this.toastTimer != null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { e.classList.remove('show'); }, ms);
  }

  // ----- derived palette index -----
  buildDerivedMap(): void {
    this.derivedMap = {};
    for (const d of this.state.derived) {
      if (d.name) this.derivedMap[d.name] = d;
    }
  }

  currentTheme(): Theme {
    return getTheme(this.state.themeId);
  }
  renderCtx(): RenderContext {
    return { theme: this.currentTheme(), derivedMap: this.derivedMap };
  }

  updateAmbientLib(): void {
    setAmbientLib(this.state.derived.map((d) => d.name).filter(Boolean));
  }

  // ----- save (debounced URL hash write) -----
  scheduleSave(): void {
    if (this.saveTimer != null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      void this.save();
    }, 500);
    this.updateCrumbs();
  }

  async save(): Promise<void> {
    try {
      const hash = await encodeStateToHash(this.state);
      history.replaceState(null, '', '#' + hash);
    } catch (e) {
      console.warn('save failed', e);
    }
  }

  async loadFromUrl(): Promise<WorkspaceState | null> {
    return decodeStateFromHash(location.hash);
  }

  // Many sub-systems need to fire a re-render across all components.
  rerenderAllStates(): void {
    for (const c of this.components) c.renderStates();
  }
  applyTerminalOptionsToAll(): void {
    for (const c of this.components) c.applyTerminalOptions();
  }

  // ====================== sidebar: themes ======================
  renderThemeList(): void {
    const host = $('theme-list');
    host.innerHTML = '';

    for (const variant of THEME_VARIANTS) {
      const entries = themesByVariant(variant);
      if (entries.length === 0) continue;

      const head = el('div', 'theme-group-h');
      head.append(
        el('span', 'tg-dot tg-' + variant),
        el('span', 'tg-lbl', variant),
        el('span', 'tg-count', String(entries.length)),
      );
      host.appendChild(head);

      const grid = el('div', 'theme-grid');
      for (const [id, t] of entries) {
        const row = el('div', 'theme-item' + (id === this.state.themeId ? ' active' : ''));
        row.dataset['themeId'] = id;
        row.style.background = t.background;

        const name = el('span', 'theme-name', t.name);
        name.style.color = t.foreground; // readable on the theme's own bg

        const swatch = el('div', 'theme-swatch');
        const swatchKeys: AnsiName[] = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'brightBlack', 'brightWhite'];
        for (const c of swatchKeys) {
          const s = document.createElement('div');
          s.style.background = t.ansi[c];
          swatch.appendChild(s);
        }

        row.append(name, swatch);
        row.addEventListener('click', () => { this.setTheme(id); });
        grid.appendChild(row);
      }
      host.appendChild(grid);
    }
  }

  setTheme(id: string): void {
    if (this.state.themeId === id) return;
    this.state.themeId = id;
    document.querySelectorAll<HTMLElement>('.theme-item').forEach((e) => {
      e.classList.toggle('active', e.dataset['themeId'] === id);
    });
    this.applyTerminalOptionsToAll();
    this.rerenderAllStates();
    this.renderDerivedList();
    this.updateStageBanner();
    this.scheduleSave();
  }

  // ====================== sidebar: fonts =======================
  renderFontList(): void {
    const host = $('font-list');
    host.innerHTML = '';
    for (const [id, f] of Object.entries(FONTS) as [string, Font][]) {
      const row = el('div', 'font-item' + (id === this.state.fontId ? ' active' : ''));
      row.dataset['fontId'] = id;
      row.innerHTML =
        '<span class="font-name">' + f.name + '</span>' +
        '<span class="font-sample" style="font-family:' + f.family + '">' + f.sample + '</span>';
      row.addEventListener('click', () => { this.setFont(id); });
      host.appendChild(row);
    }
  }

  setFont(id: string): void {
    if (this.state.fontId === id) return;
    this.state.fontId = id;
    document.querySelectorAll<HTMLElement>('.font-item').forEach((e) => {
      e.classList.toggle('active', e.dataset['fontId'] === id);
    });
    this.applyTerminalOptionsToAll();
    this.updateStageBanner();
    this.scheduleSave();
  }

  setNerdIcons(v: boolean): void {
    this.state.nerdIcons = v;
    this.applyTerminalOptionsToAll();
    this.scheduleSave();
  }

  setFontSize(size: number): void {
    this.state.fontSize = size;
    setText('font-size-val', px(size));
    this.applyTerminalOptionsToAll();
    this.rerenderAllStates();
    this.updateStageBanner();
    this.scheduleSave();
  }

  // ================ sidebar: derived palette ===================
  renderDerivedList(): void {
    const host = $('derived-list');
    host.innerHTML = '';
    setText(
      'derived-hint',
      `${String(this.state.derived.length)} ${this.state.derived.length === 1 ? 'color' : 'colors'}`,
    );

    this.state.derived.forEach((d, idx) => {
      host.appendChild(this.buildDerivedCard(d, idx));
    });
  }

  private buildDerivedCard(d: DerivedColor, idx: number): HTMLDivElement {
    const card = el('div', 'derived-card');
    const r1 = el('div', 'derived-row1');

    const swatch = el('div', 'derived-swatch');
    const baseHex = this.currentTheme().ansi[d.base];
    swatch.style.background = applyDerivation(
      baseHex,
      this.currentTheme().background,
      d.dSat,
      d.dLit,
      d.alpha,
    );

    const nameWrap = el('div', 'derived-name-wrap');
    const prefix = el('span', 'derived-prefix', '$');
    const nameInput = document.createElement('input');
    nameInput.className = 'derived-name';
    nameInput.value = d.name;
    nameInput.placeholder = 'name';
    nameInput.spellcheck = false;
    nameInput.addEventListener('input', () => {
      d.name = nameInput.value.replace(/[^a-zA-Z0-9_-]/g, '');
      if (d.name !== nameInput.value) nameInput.value = d.name;
      this.buildDerivedMap();
      this.updateAmbientLib();
      this.rerenderAllStates();
      this.scheduleSave();
    });
    nameWrap.append(prefix, nameInput);

    const del = el('button', 'derived-del', '✕');
    del.title = 'delete';
    del.addEventListener('click', () => {
      this.state.derived.splice(idx, 1);
      this.buildDerivedMap();
      this.updateAmbientLib();
      this.renderDerivedList();
      this.rerenderAllStates();
      this.scheduleSave();
    });

    r1.append(swatch, nameWrap, del);

    const r2 = el('div', 'derived-row2');

    const baseSel = document.createElement('select');
    baseSel.className = 'derived-base-select';
    for (const c of ANSI_NAMES) {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      if (c === d.base) o.selected = true;
      baseSel.appendChild(o);
    }
    baseSel.addEventListener('change', () => {
      d.base = baseSel.value as AnsiName;
      this.refreshDerivedSwatch(idx);
      this.rerenderAllStates();
      this.scheduleSave();
    });
    r2.appendChild(baseSel);

    const mkSlider = (
      label: string,
      key: 'dSat' | 'dLit' | 'alpha',
      lo: number,
      hi: number,
      step: number,
      fmt: (v: number) => string,
    ): HTMLDivElement => {
      const row = el('div', 'slider-row');
      row.appendChild(el('span', 'lbl', label));
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = String(lo);
      inp.max = String(hi);
      inp.step = String(step);
      inp.value = String(d[key]);
      const val = el('span', 'val', fmt(d[key]));
      inp.addEventListener('input', () => {
        d[key] = parseFloat(inp.value);
        val.textContent = fmt(d[key]);
        this.refreshDerivedSwatch(idx);
        this.rerenderAllStates();
        this.scheduleSave();
      });
      row.append(inp, val);
      return row;
    };

    r2.append(
      mkSlider('S', 'dSat', -100, 100, 1, (v) => (v >= 0 ? '+' : '') + String(v)),
      mkSlider('L', 'dLit', -100, 100, 1, (v) => (v >= 0 ? '+' : '') + String(v)),
      mkSlider('α', 'alpha', 0, 1, 0.01, (v) => v.toFixed(2)),
    );

    card.append(r1, r2);
    return card;
  }

  refreshDerivedSwatch(idx: number): void {
    const d = this.state.derived[idx];
    if (!d) return;
    const cards = document.querySelectorAll<HTMLDivElement>('#derived-list .derived-card');
    const card = cards[idx];
    if (!card) return;
    const sw = card.querySelector<HTMLDivElement>('.derived-swatch');
    if (!sw) return;
    const baseHex = this.currentTheme().ansi[d.base];
    sw.style.background = applyDerivation(
      baseHex,
      this.currentTheme().background,
      d.dSat,
      d.dLit,
      d.alpha,
    );
  }

  addDerived(): void {
    let n = 1;
    let name = 'color1';
    while (this.derivedMap[name]) {
      n++;
      name = 'color' + String(n);
    }
    this.state.derived.push({
      id: nextId(),
      name,
      base: 'white',
      dSat: 0,
      dLit: 0,
      alpha: 1,
    });
    this.buildDerivedMap();
    this.updateAmbientLib();
    this.renderDerivedList();
    this.scheduleSave();
  }

  // ===================== components ============================
  addComponent(source: string): void {
    const comp = new ComponentInstance(nextId(), source, this);
    this.components.push(comp);
    $('component-list').appendChild(comp.el);
    comp.mount();
    this.updateCrumbs();
    this.scheduleSave();
  }

  removeComponent(comp: ComponentInstance): void {
    const idx = this.components.indexOf(comp);
    if (idx < 0) return;
    comp.dispose();
    comp.el.remove();
    this.components.splice(idx, 1);
    this.updateCrumbs();
    this.scheduleSave();
  }

  // ================== crumbs / modeline ========================
  updateCrumbs(): void {
    const t = this.currentTheme();
    const f = (FONTS as Record<string, Font>)[this.state.fontId];
    setText('crumb-theme', t.name);
    setText('crumb-font', f ? f.name : this.state.fontId);
    setText('crumb-comp', this.components.length);
    setText('crumb-derived', this.state.derived.length);
    setText('ml-theme', t.name);
    setText('ml-font', (f ? f.name : this.state.fontId) + (this.state.nerdIcons ? ' +nf' : ''));
    setText('ml-size', px(this.state.fontSize));
    setText('ml-comp', `${String(this.components.length)} component${this.components.length === 1 ? '' : 's'}`);
    setText('ml-derived', `$${String(this.state.derived.length)}`);
    this.updateStageBanner();
  }

  updateStageBanner(): void {
    const t = this.currentTheme();
    const f = (FONTS as Record<string, Font>)[this.state.fontId];
    setText('stage-theme', t.name);
    setText('stage-font', (f ? f.name : this.state.fontId) + (this.state.nerdIcons ? ' + Nerd Font' : ''));
    setText('stage-size', px(this.state.fontSize));
  }

  // ====================== stage mode ===========================
  // Stage mode is a presentation view: hide all chrome, show ONE
  // component at a time, scale the terminal font way up, and let
  // arrows / on-screen buttons cycle.

  effectiveFontSize(): number {
    return this.stageActive ? this.stageFontSize : this.state.fontSize;
  }

  enterStageMode(focusComp?: ComponentInstance): void {
    if (this.components.length === 0) {
      this.toast('add a component first');
      return;
    }
    document.body.classList.add('stage-mode');
    this.stageActive = true;
    const idx = focusComp ? this.components.indexOf(focusComp) : 0;
    this.stageIndex = Math.max(0, idx);
    this.applyStageVisibility();
    this.applyTerminalOptionsToAll();
    this.rerenderAllStates();
    this.updateStageBanner();
    this.toast('stage — ← → to navigate, esc to exit');
  }

  exitStageMode(): void {
    if (!this.stageActive) return;
    document.body.classList.remove('stage-mode');
    this.stageActive = false;
    for (const c of this.components) c.el.classList.remove('stage-current');
    this.applyTerminalOptionsToAll();
    this.rerenderAllStates();
  }

  applyStageVisibility(): void {
    this.components.forEach((c, i) => {
      c.el.classList.toggle('stage-current', i === this.stageIndex);
    });
    const cur = this.components[this.stageIndex];
    const stateCount = cur?.stateCards.length ?? 0;
    if (this.stageStateIndex >= stateCount) this.stageStateIndex = 0;
    if (cur) {
      cur.stateCards.forEach((sc, i) => {
        sc.el.classList.toggle('stage-state-current', i === this.stageStateIndex);
      });
    }
    setText('stage-idx', pad2(this.stageIndex + 1));
    setText('stage-total', pad2(this.components.length));
    setText('stage-name', cur?.spec?.name ?? '—');
    const curState = cur?.stateCards[this.stageStateIndex]?.state;
    setText('stage-state-name', curState?.name ?? '—');
    setText('stage-state-idx', pad2(this.stageStateIndex + 1));
    setText('stage-state-total', pad2(stateCount));
  }

  refreshCurrent(): void {
    requestAnimationFrame(() => {
      this.components[this.stageIndex]?.refreshVisibleTerminal();
    });
  }
  stageNext(): void {
    if (!this.stageActive || this.components.length === 0) return;
    this.stageIndex = (this.stageIndex + 1) % this.components.length;
    this.stageStateIndex = 0;
    this.applyStageVisibility();
    this.refreshCurrent();
  }
  stagePrev(): void {
    if (!this.stageActive || this.components.length === 0) return;
    this.stageIndex = (this.stageIndex - 1 + this.components.length) % this.components.length;
    this.stageStateIndex = 0;
    this.applyStageVisibility();
    this.refreshCurrent();
  }
  stageStateNext(): void {
    if (!this.stageActive) return;
    const cur = this.components[this.stageIndex];
    if (!cur || cur.stateCards.length === 0) return;
    this.stageStateIndex = (this.stageStateIndex + 1) % cur.stateCards.length;
    this.applyStageVisibility();
    this.refreshCurrent();
  }
  stageStatePrev(): void {
    if (!this.stageActive) return;
    const cur = this.components[this.stageIndex];
    if (!cur || cur.stateCards.length === 0) return;
    this.stageStateIndex = (this.stageStateIndex - 1 + cur.stateCards.length) % cur.stateCards.length;
    this.applyStageVisibility();
    this.refreshCurrent();
  }
  bumpStageFontSize(delta: number): void {
    this.stageFontSize = Math.max(12, Math.min(72, this.stageFontSize + delta));
    setText('stage-fs', px(this.stageFontSize));
    this.applyTerminalOptionsToAll();
    this.rerenderAllStates();
  }

  // ========================== init =============================
  async init(): Promise<void> {
    const loaded = await this.loadFromUrl();
    this.state = loaded ?? makeSeedState();
    this.buildDerivedMap();

    // sidebar UI
    this.renderThemeList();
    this.renderFontList();
    this.renderDerivedList();

    // initial control values
    const nerd = $asMaybe('nerd-toggle', HTMLInputElement);
    if (nerd) nerd.checked = this.state.nerdIcons;
    const sizeInput = $asMaybe('font-size-slider', HTMLInputElement);
    if (sizeInput) sizeInput.value = String(this.state.fontSize);
    setText('font-size-val', px(this.state.fontSize));

    this.updateCrumbs();

    // Monaco
    this.monaco = await loadMonaco();
    this.updateAmbientLib();

    // replace loader
    const list = $('component-list');
    list.innerHTML = '';
    const footer = $maybe('footer-actions');
    if (footer) footer.style.display = 'block';

    for (const c of this.state.components) {
      const comp = new ComponentInstance(c.id, c.source, this);
      this.components.push(comp);
      list.appendChild(comp.el);
    }
    for (const comp of this.components) comp.mount();

    this.wireEvents();
    this.updateCrumbs();
  }

  private wireEvents(): void {
    const sbToggle = $('sidebar-toggle');
    if (localStorage.getItem('tuicraft-sb') === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
    sbToggle.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('tuicraft-sb', collapsed ? '1' : '0');
      setTimeout(() => { this.applyTerminalOptionsToAll(); }, 220);
    });
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && !e.shiftKey) {
        e.preventDefault();
        sbToggle.click();
      }
    });

    $('add-derived-btn').addEventListener('click', () => { this.addDerived(); });
    $as('nerd-toggle', HTMLInputElement).addEventListener('change', (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement) this.setNerdIcons(t.checked);
    });
    $as('font-size-slider', HTMLInputElement).addEventListener('input', (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement) this.setFontSize(parseInt(t.value, 10));
    });

    $('add-component-btn').addEventListener('click', () => {
      this.addComponent(NEW_COMPONENT_TEMPLATE);
    });

    $('copy-url-btn').addEventListener('click', () => {
      void (async (): Promise<void> => {
        await this.save();
        try {
          await navigator.clipboard.writeText(location.href);
          this.toast('url copied — paste to share workspace');
        } catch {
          this.toast('press cmd+c to copy url');
        }
      })();
    });

    $('stage-btn').addEventListener('click', () => { this.enterStageMode(); });
    $('stage-exit-btn').addEventListener('click', () => { this.exitStageMode(); });
    $('stage-prev-btn').addEventListener('click', () => { this.stagePrev(); });
    $('stage-next-btn').addEventListener('click', () => { this.stageNext(); });
    $('stage-state-prev-btn').addEventListener('click', () => { this.stageStatePrev(); });
    $('stage-state-next-btn').addEventListener('click', () => { this.stageStateNext(); });
    $('stage-fs-up').addEventListener('click', () => { this.bumpStageFontSize(2); });
    $('stage-fs-down').addEventListener('click', () => { this.bumpStageFontSize(-2); });

    $('reset-btn').addEventListener('click', () => {
      if (!confirm('Reset workspace? Everything will be lost.')) return;
      location.hash = '';
      location.reload();
    });

    $('help-btn').addEventListener('click', (e) => { this.toggleHelp(e); });
    document.addEventListener('click', (e) => {
      const pop = $maybe('help-popover');
      if (!pop || pop.style.display === 'none') return;
      const target = e.target;
      if (target instanceof Node && pop.contains(target)) return;
      if (target instanceof Element && target.id === 'help-btn') return;
      pop.style.display = 'none';
    });
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.stageActive) {
        this.exitStageMode();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (this.stageActive) this.exitStageMode();
        else this.enterStageMode();
        return;
      }
      if (this.stageActive) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          this.stageNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          this.stagePrev();
        } else if (e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          this.stageStateNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.stageStatePrev();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.bumpStageFontSize(2);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.bumpStageFontSize(-2);
        }
      }
    });
  }

  private toggleHelp(e: MouseEvent): void {
    const pop = $('help-popover');
    if (pop.style.display !== 'none') {
      pop.style.display = 'none';
      return;
    }
    pop.innerHTML = `
      <h4>tuicraft</h4>
      <p>Each component is a single <code>.tsx</code> file: a TypeScript interface
         (the contract), a <code>render</code> function returning JSX that emits
         ANSI, and a list of <code>states</code> conforming to the contract.</p>
      <p><strong>Intrinsics:</strong> <code>&lt;fg&gt;</code>, <code>&lt;bg&gt;</code>,
         <code>&lt;bold&gt;</code>, <code>&lt;dim&gt;</code>, <code>&lt;italic&gt;</code>,
         <code>&lt;underline&gt;</code>, <code>&lt;inverse&gt;</code>,
         <code>&lt;line&gt;</code>, <code>&lt;span&gt;</code>.</p>
      <p><strong>Colors:</strong> ANSI 16 (<code>"red"</code>, <code>"brightBlue"</code>) re-map
         per theme. Hex (<code>"#f59e0b"</code>) is absolute.
         <code>"$name"</code> references a derived color and re-resolves on theme switch.</p>
      <p><strong>Sharing:</strong> the whole workspace (theme, fonts, palette, every component)
         lives in the URL hash. Click <code>share url</code> to copy. Press
         <code>⌘⇧P</code> to enter stage mode for a presentation display.</p>
    `;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const rect = target.getBoundingClientRect();
    pop.style.top = px(rect.bottom + 8);
    pop.style.right = px(window.innerWidth - rect.right);
    pop.style.left = 'auto';
    pop.style.display = 'block';
    e.stopPropagation();
  }
}

// Singleton — exactly one instance per page. Sanity check on the THEMES
// import here so accidental tree-shaking failures show up at boot.
if (Object.keys(THEMES).length === 0) {
  throw new Error('themes registry empty — bad bundle');
}

export type App = AppImpl;
export const app: App = new AppImpl();
