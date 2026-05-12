// Monaco loader, refit for Vite. We import `monaco-editor` from npm and
// use Vite's native `?worker` suffix to ship the editor & TS workers as
// separate, hashed bundles. The original prototype shipped Monaco from
// a CDN through an AMD `loader.min.js`, with a blob-URL bootstrap to
// satisfy a sandboxed-iframe host (claude.ai/design). On a real origin
// we don't need any of that — Vite handles the worker plumbing.

import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

import { ambientLibSource } from '@tuicraft/core';

export type Monaco = typeof monaco;

let _setupDone = false;

/**
 * Install Monaco's worker factory. Call once per page. Subsequent calls
 * are a no-op so the studio can re-init safely (e.g. on hot reload).
 */
export function setupMonacoEnvironment(): void {
  if (_setupDone) return;
  _setupDone = true;
  // self.MonacoEnvironment is a global Monaco reads at construction time.
  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      switch (label) {
        case 'typescript':
        case 'javascript':
          return new TsWorker();
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker();
        case 'html':
        case 'handlebars':
        case 'razor':
          return new HtmlWorker();
        case 'json':
          return new JsonWorker();
        default:
          return new EditorWorker();
      }
    },
  };
}

/**
 * Configure the TypeScript language service for the studio: relaxed
 * strictness (so user-authored DSL templates type-check loosely),
 * React-style JSX with our `h`/`Fragment` factories.
 */
export function setupTypescriptDefaults(): void {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'h',
    jsxFragmentFactory: 'Fragment',
    allowNonTsExtensions: true,
    strict: false,
    noImplicitAny: false,
    noEmit: false,
    allowJs: true,
    skipLibCheck: true,
    isolatedModules: false,
    lib: ['es2020', 'dom'],
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
}

/**
 * Push the latest ambient `.d.ts` (built from the active set of derived
 * color names) into Monaco. Replaces any prior copy.
 */
export function setAmbientLib(derivedNames: readonly string[]): void {
  monaco.languages.typescript.typescriptDefaults.setExtraLibs([
    {
      content: ambientLibSource(derivedNames),
      filePath: 'file:///tuicraft.globals.d.ts',
    },
  ]);
}

/**
 * Phosphor-chartreuse editor theme that matches the surrounding chrome.
 * Defined once; safe to call multiple times (Monaco overwrites).
 */
export function defineTuicraftTheme(): void {
  monaco.editor.defineTheme('tuicraft-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5f6470', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c8f432' },
      { token: 'string', foreground: 'a8d016' },
      { token: 'number', foreground: '5e9fff' },
      { token: 'type', foreground: '5e9fff' },
      { token: 'identifier', foreground: 'e8eaf0' },
      { token: 'tag', foreground: 'c8f432' },
      { token: 'attribute.name', foreground: 'f5a524' },
      { token: 'attribute.value', foreground: 'a8d016' },
      { token: 'delimiter', foreground: '8b909e' },
    ],
    colors: {
      'editor.background': '#14161c',
      'editor.foreground': '#e8eaf0',
      'editor.lineHighlightBackground': '#1b1e25',
      'editorLineNumber.foreground': '#2c313d',
      'editorLineNumber.activeForeground': '#8b909e',
      'editor.selectionBackground': '#3a4151',
      'editor.inactiveSelectionBackground': '#242832',
      'editorIndentGuide.background': '#1b1e25',
      'editorIndentGuide.activeBackground': '#2c313d',
      'editorCursor.foreground': '#c8f432',
      'editorGutter.background': '#14161c',
      'editorWidget.background': '#1b1e25',
      'editorWidget.border': '#2c313d',
      'editorSuggestWidget.background': '#1b1e25',
      'editorSuggestWidget.border': '#2c313d',
      'editorSuggestWidget.selectedBackground': '#242832',
      'editorError.foreground': '#ff5470',
      'editorWarning.foreground': '#f5a524',
    },
  });
}

/** All-in-one boot. Returns the `monaco` module. */
export async function loadMonaco(): Promise<Monaco> {
  setupMonacoEnvironment();
  setupTypescriptDefaults();
  defineTuicraftTheme();
  // The actual `monaco-editor` module is statically imported and ready
  // immediately under Vite. The async signature keeps the call site
  // identical to the legacy CDN-AMD loader for a smaller diff.
  return Promise.resolve(monaco);
}

/** Promise wrapper that fails with a labelled error after `ms` ms. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => {
        rej(new Error(label + ' timed out after ' + String(ms) + 'ms'));
      }, ms),
    ),
  ]);
}

/**
 * Flatten Monaco / TypeScript diagnostic chains to a single line.
 * `messageText` may be a string or a recursive `DiagnosticMessageChain`.
 */
export function formatDiagnostic(d: monaco.languages.typescript.Diagnostic): string {
  const parts: string[] = [];
  let cur: unknown = d.messageText;
  // Walk the .next chain (if any) and join with ' ← '.
  while (cur !== null && cur !== undefined) {
    if (typeof cur === 'string') {
      parts.push(cur);
      break;
    }
    if (typeof cur === 'object') {
      const obj = cur as { messageText?: unknown; next?: unknown };
      if (typeof obj.messageText === 'string') parts.push(obj.messageText);
      const next = obj.next;
      cur = Array.isArray(next) && next.length > 0 ? next[0] : null;
    } else {
      // Numbers / booleans — coerce safely.
      parts.push(typeof cur === 'number' || typeof cur === 'boolean' ? String(cur) : '');
      break;
    }
  }
  return `TS${String(d.code)}: ${parts.join(' ← ') || 'unknown error'}`;
}
