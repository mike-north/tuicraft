// One ComponentInstance per card. It owns:
//   - A Monaco editor + model (the source of truth for the TSX file).
//   - An xterm.js terminal per state (live previews of each state).
//
// On every keystroke it debounces a recompile via Monaco's TS worker,
// evaluates the emitted JS in a sandboxed Function with the JSX runtime
// injected, and walks the returned spec to drive the terminals.

import * as monaco from 'monaco-editor';
import { Terminal } from '@xterm/xterm';
import {
  h,
  Fragment,
  renderTreeToAnsi,
  resolveFontFamily,
  type JSXNode,
} from '@tuicraft/core';
type HFn = typeof h;
type FragFn = typeof Fragment;
import { withTimeout, formatDiagnostic } from './monaco-loader.js';
import { el } from './dom.js';
import type { App } from './app.js';

interface ComponentState<P = unknown> {
  name: string;
  data: P;
}

interface ComponentSpec<P = unknown> {
  name: string;
  render: (props: P) => JSXNode;
  states: ComponentState<P>[];
}

interface StateCard {
  el: HTMLDivElement;
  term: Terminal;
  nameEl: HTMLSpanElement;
  badgeEl: HTMLSpanElement;
  dataEl: HTMLDivElement;
  dataVisible: boolean;
  state: ComponentState | null;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Minimal contract check for a value pulled out of user-evaled JS. */
function isComponentSpec(v: unknown): v is ComponentSpec {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { name?: unknown; render?: unknown; states?: unknown };
  return (
    typeof o.name === 'string' &&
    typeof o.render === 'function' &&
    Array.isArray(o.states)
  );
}

export class ComponentInstance {
  readonly id: string;
  readonly el: HTMLDivElement;
  source: string;
  spec: ComponentSpec | null = null;
  stateCards: StateCard[] = [];

  private readonly app: App;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private model: monaco.editor.ITextModel | null = null;
  private compileTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly filenameEl: HTMLSpanElement;
  private readonly metaEl: HTMLDivElement;
  private readonly statusLabelEl: HTMLSpanElement;
  private readonly statesCountEl: HTMLSpanElement;
  private readonly editorHostEl: HTMLDivElement;
  private readonly statesListEl: HTMLDivElement;

  constructor(id: string, source: string, app: App) {
    this.id = id;
    this.source = source;
    this.app = app;

    // ---- header ----
    const card = el('div', 'component-card');
    const header = el('div', 'card-header');

    const file = el('div', 'card-file');
    const icon = el('span', 'ficon');
    icon.textContent = ''; // nerd-font: typescript glyph
    const filename = el('span', 'filename untitled', 'untitled');
    const ext = el('span', 'ext', '.tsx');
    file.append(icon, filename, ext);

    const meta = el('div', 'card-meta pending');
    meta.innerHTML =
      '<span class="status-dot"></span>' +
      '<span class="item"><span class="k">status</span><span class="v status-label">working</span></span>' +
      '<span class="item"><span class="k">states</span><span class="v states-count">0</span></span>';

    const tools = el('div', 'card-tools');
    const focusBtn = el('button', 'card-tool');
    focusBtn.title = 'focus this component (stage mode)';
    focusBtn.innerHTML = '<span class="focus-glyph"></span>';
    focusBtn.addEventListener('click', () => { this.app.enterStageMode(this); });

    const delBtn = el('button', 'card-tool danger');
    delBtn.title = 'remove component';
    delBtn.innerHTML = '<span class="x"></span>';
    delBtn.addEventListener('click', () => {
      if (confirm('Remove this component?')) this.app.removeComponent(this);
    });
    tools.append(focusBtn, delBtn);

    header.append(file, meta, tools);

    // ---- body ----
    const body = el('div', 'card-body');
    const editorPane = el('div', 'editor-pane');
    const editorHost = el('div', 'editor-host');
    editorPane.appendChild(editorHost);

    const statesPane = el('div', 'states-pane');
    const statesH = el('div', 'states-h');
    statesH.innerHTML = '<span class="num">▸</span><span class="label">states</span><span class="rule"></span>';
    const statesList = el('div', 'states-list');
    statesPane.append(statesH, statesList);

    body.append(editorPane, statesPane);
    card.append(header, body);

    const statusLabelEl = meta.querySelector<HTMLSpanElement>('.status-label');
    const statesCountEl = meta.querySelector<HTMLSpanElement>('.states-count');
    if (!statusLabelEl || !statesCountEl) {
      // Programmer error — the innerHTML literal above guarantees these exist.
      throw new Error('component card meta template is missing required spans');
    }

    this.el = card;
    this.filenameEl = filename;
    this.metaEl = meta;
    this.statusLabelEl = statusLabelEl;
    this.statesCountEl = statesCountEl;
    this.editorHostEl = editorHost;
    this.statesListEl = statesList;
  }

  mount(): void {
    const uri = monaco.Uri.parse('file:///component-' + this.id + '.tsx');
    this.model = monaco.editor.createModel(this.source, 'typescript', uri);

    this.editor = monaco.editor.create(this.editorHostEl, {
      model: this.model,
      theme: 'tuicraft-dark',
      fontFamily: '"JetBrains Mono", "Symbols Nerd Font Mono", ui-monospace, monospace',
      fontSize: 12.5,
      fontLigatures: false,
      lineHeight: 18,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      smoothScrolling: false,
      renderLineHighlight: 'none',
      lineNumbersMinChars: 3,
      glyphMargin: false,
      folding: true,
      padding: { top: 10, bottom: 10 },
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
    });

    const model = this.model;
    model.onDidChangeContent(() => {
      this.source = model.getValue();
      this.markPending();
      if (this.compileTimer != null) clearTimeout(this.compileTimer);
      this.compileTimer = setTimeout(() => {
        void this.compileAndRender();
      }, 350);
      this.app.scheduleSave();
    });

    void this.compileAndRender();
  }

  markPending(): void {
    this.metaEl.className = 'card-meta pending';
    this.statusLabelEl.textContent = 'working';
    this.el.classList.remove('ok', 'err');
  }
  markOk(): void {
    this.metaEl.className = 'card-meta ok';
    this.statusLabelEl.textContent = 'ok';
    this.el.classList.remove('err');
    this.el.classList.add('ok');
  }
  markErr(msg: string): void {
    this.metaEl.className = 'card-meta err';
    this.statusLabelEl.textContent = 'error';
    this.statusLabelEl.title = msg;
    this.el.classList.remove('ok');
    this.el.classList.add('err');
  }

  async compileAndRender(): Promise<void> {
    if (!this.model) return;
    let jsCode: string | null = null;
    try {
      const getWorker = await withTimeout(
        monaco.languages.typescript.getTypeScriptWorker(),
        15000,
        'ts worker init',
      );
      const client = await withTimeout(getWorker(this.model.uri), 8000, 'ts worker connect');
      const uriStr = this.model.uri.toString();
      const out = await withTimeout(client.getEmitOutput(uriStr), 8000, 'ts emit');
      const f = out.outputFiles.find((file) => /\.jsx?$/.test(file.name));
      if (!f) {
        try {
          const [syn, sem] = await Promise.all([
            client.getSyntacticDiagnostics(uriStr).catch(() => [] as monaco.languages.typescript.Diagnostic[]),
            client.getSemanticDiagnostics(uriStr).catch(() => [] as monaco.languages.typescript.Diagnostic[]),
          ]);
          const first = syn[0] ?? sem[0];
          const msg = first ? formatDiagnostic(first) : 'no emit output';
          this.markErr(msg);
          this.renderErrorPlaceholder(msg);
        } catch {
          this.markErr('no emit output');
          this.renderErrorPlaceholder('no emit output');
        }
        return;
      }
      jsCode = f.text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.markErr('compile: ' + msg);
      this.renderErrorPlaceholder(msg);
      return;
    }

    let spec: ComponentSpec;
    try {
      let captured: unknown = null;
      const dc = (s: unknown): unknown => {
        captured = s;
        return s;
      };
      const moduleObj: { exports: { default?: unknown } } = { exports: {} };
      // The Monaco TS worker emits CommonJS — it expects exports/module/require.
      // We pass our own JSX runtime in lieu of an actual import resolver.
      // `new Function` is the whole point: we are evaluating user-authored
      // code captured from Monaco. The eval is sandboxed to the closures
      // we explicitly inject.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(
        'exports', 'module', 'require',
        'h', 'Fragment', 'defineComponent',
        jsCode,
      ) as (
        exports: object,
        module: object,
        require: (id: string) => Record<string, unknown>,
        h: HFn,
        Fragment: FragFn,
        defineComponent: (s: unknown) => unknown,
      ) => void;

      const noopRequire = (): Record<string, unknown> => ({});
      fn(moduleObj.exports, moduleObj, noopRequire, h, Fragment, dc);
      const candidate = moduleObj.exports.default ?? captured;
      if (!candidate) throw new Error('no defineComponent(...) call found');
      if (!isComponentSpec(candidate)) {
        throw new Error('defineComponent(...) shape: { name, render, states[] } required');
      }
      spec = candidate;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.markErr('runtime: ' + msg);
      this.renderErrorPlaceholder(msg);
      return;
    }

    this.spec = spec;
    this.markOk();
    this.filenameEl.textContent = spec.name || 'unnamed';
    this.filenameEl.classList.toggle('untitled', !spec.name);
    this.statesCountEl.textContent = String(spec.states.length);

    this.reconcileStates(spec.states);
    this.renderStates();
  }

  private renderErrorPlaceholder(msg: string): void {
    this.statesListEl.innerHTML = '';
    const e = el('div', 'state-error', msg);
    this.statesListEl.appendChild(e);
    this.stateCards = [];
  }

  private reconcileStates(states: ComponentState[]): void {
    // Strip any stale error placeholder left by a prior failed compile —
    // otherwise it lingers above the freshly-rendered state cards.
    this.statesListEl.querySelectorAll('.state-error').forEach((e) => { e.remove(); });

    while (this.stateCards.length > states.length) {
      const sc = this.stateCards.pop();
      if (!sc) break;
      sc.term.dispose();
      sc.el.remove();
    }
    while (this.stateCards.length < states.length) {
      const idx = this.stateCards.length;
      const sc = this.buildStateCard(idx);
      this.stateCards.push(sc);
      this.statesListEl.appendChild(sc.el);
    }
    states.forEach((s, i) => {
      const sc = this.stateCards[i];
      if (!sc) return;
      sc.state = s;
      sc.nameEl.textContent = s.name || ('state ' + String(i + 1));
      sc.badgeEl.textContent = String(i + 1).padStart(2, '0');
      if (sc.dataVisible) sc.dataEl.textContent = safeJson(s.data);
    });
  }

  private buildStateCard(idx: number): StateCard {
    const root = el('div', 'state-card');

    const head = el('div', 'state-h');
    const badge = el('span', 'badge', String(idx + 1).padStart(2, '0'));
    const nameEl = el('span', 'state-name', 'state');
    head.append(badge, nameEl);

    const toggles = el('div', 'state-toggles');
    const dataToggle = el('button', 'state-toggle', 'data');
    toggles.appendChild(dataToggle);
    head.appendChild(toggles);
    root.appendChild(head);

    const termEl = el('div', 'state-terminal');
    root.appendChild(termEl);

    const dataEl = el('div', 'state-data');
    dataEl.style.display = 'none';
    root.appendChild(dataEl);

    const theme = this.app.currentTheme();
    const fontFamily = resolveFontFamily(this.app.state.fontId, this.app.state.nerdIcons);
    const term = new Terminal({
      cols: 64,
      rows: 4,
      fontFamily,
      fontSize: this.app.effectiveFontSize(),
      lineHeight: 1.2,
      cursorBlink: false,
      cursorStyle: 'block',
      cursorInactiveStyle: 'none',
      disableStdin: true,
      convertEol: true,
      allowTransparency: false,
      scrollback: 0,
      theme: {
        foreground: theme.foreground,
        background: theme.background,
        cursor: theme.cursor,
        ...theme.ansi,
      },
    });
    term.open(termEl);
    termEl.style.setProperty('--state-term-bg', theme.background);
    term.write('\x1b[?25l');

    const sc: StateCard = { el: root, term, nameEl, badgeEl: badge, dataEl, dataVisible: false, state: null };
    dataToggle.addEventListener('click', () => {
      sc.dataVisible = !sc.dataVisible;
      dataToggle.classList.toggle('on', sc.dataVisible);
      dataEl.style.display = sc.dataVisible ? 'block' : 'none';
      if (sc.dataVisible && sc.state) dataEl.textContent = safeJson(sc.state.data);
    });

    return sc;
  }

  renderStates(): void {
    const spec = this.spec;
    if (!spec) return;
    const ctx = this.app.renderCtx();
    spec.states.forEach((s, i) => {
      const sc = this.stateCards[i];
      if (!sc) return;
      let ansi: string;
      try {
        const tree = spec.render(s.data);
        ansi = renderTreeToAnsi(tree, ctx);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        ansi = '\x1b[31mrender error: ' + msg + '\x1b[0m';
      }
      const lines = ansi.split('\r\n').length;
      const rows = Math.max(1, Math.min(40, lines));
      sc.term.resize(sc.term.cols, rows);
      sc.term.reset();
      sc.term.write('\x1b[?25l');
      sc.term.write(ansi);
    });
  }

  applyTerminalOptions(): void {
    const theme = this.app.currentTheme();
    const fontFamily = resolveFontFamily(this.app.state.fontId, this.app.state.nerdIcons);
    const size = this.app.effectiveFontSize();
    for (const sc of this.stateCards) {
      sc.term.options.fontFamily = fontFamily;
      sc.term.options.fontSize = size;
      sc.term.options.theme = {
        foreground: theme.foreground,
        background: theme.background,
        cursor: theme.cursor,
        ...theme.ansi,
      };
      // Paint the wrapping element with the theme bg so the padding around
      // the terminal canvas matches — otherwise a strip of app-bg shows.
      const wrap = sc.term.element?.parentElement;
      if (wrap) wrap.style.setProperty('--state-term-bg', theme.background);
    }
  }

  /**
   * Re-measure the currently-visible state's terminal. xterm calibrates
   * character cell width by DOM measurement; if the terminal was offscreen
   * when fontSize was set, the cells come out the wrong width and you get
   * the 'C a c h e' wide-spaced glyph bug. Toggling fontSize forces a
   * re-measure now that the element is laid out.
   */
  refreshVisibleTerminal(): void {
    const idx = this.app.stageStateIndex;
    const sc = this.stateCards[idx];
    if (!sc) return;
    const size = this.app.effectiveFontSize();
    sc.term.options.fontSize = size + 1;
    requestAnimationFrame(() => {
      sc.term.options.fontSize = size;
      this.renderStates();
    });
  }

  dispose(): void {
    if (this.compileTimer != null) clearTimeout(this.compileTimer);
    this.editor?.dispose();
    this.model?.dispose();
    for (const sc of this.stateCards) sc.term.dispose();
  }
}
