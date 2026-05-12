// Workspace persistence. The whole state — theme, derived palette,
// components — is JSON-encoded, deflated, base64-url-encoded, and
// stuck in the URL hash. "Send the URL" then equals "share the
// workspace."
//
// The codec is asymmetric on purpose: encoding strips session-local
// ids (the URL form omits them), and decoding mints fresh ones. Ids
// exist for UI reconciliation, not for cross-session identity.

import type {
  WorkspaceState,
  SerializedWorkspaceV1,
  SerializedDerivedV1,
  SerializedComponentV1,
} from './state.js';
import { DEFAULT_THEME_ID } from './themes.js';
import { DEFAULT_FONT_ID } from './fonts.js';

/** Generate a fresh, session-local id for in-memory reconciliation. */
export function nextId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function compressToBase64(str: string): Promise<string> {
  const blob = new Blob([str]);
  const stream = blob.stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  let bin = '';
  for (const v of new Uint8Array(buf)) bin += String.fromCharCode(v);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decompressFromBase64(b64: string): Promise<string> {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

/** Serialize a workspace into the v1 envelope (drops session-local ids). */
export function toSerializedV1(state: WorkspaceState): SerializedWorkspaceV1 {
  return {
    v: 1,
    themeId: state.themeId,
    fontId: state.fontId,
    fontSize: state.fontSize,
    nerdIcons: state.nerdIcons ? 1 : 0,
    derived: state.derived.map<SerializedDerivedV1>((d) => ({
      n: d.name,
      b: d.base,
      s: d.dSat,
      l: d.dLit,
      a: d.alpha,
    })),
    components: state.components.map<SerializedComponentV1>((c) => ({ s: c.source })),
  };
}

/**
 * Reverse of {@link toSerializedV1}. Generates fresh session ids; uses
 * defaults for any missing fields. Returns `null` if the envelope shape
 * isn't what we expect (forward-compatible for future schema versions).
 */
export function fromSerialized(obj: unknown): WorkspaceState | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Partial<SerializedWorkspaceV1>;
  if (o.v !== 1) return null;
  return {
    themeId: typeof o.themeId === 'string' ? o.themeId : DEFAULT_THEME_ID,
    fontId: typeof o.fontId === 'string' ? o.fontId : DEFAULT_FONT_ID,
    fontSize: typeof o.fontSize === 'number' ? o.fontSize : 13,
    nerdIcons: o.nerdIcons == null ? true : !!o.nerdIcons,
    derived: Array.isArray(o.derived)
      ? o.derived.map((d) => ({
          id: nextId(),
          name: typeof d.n === 'string' ? d.n : '',
          // d.b is typed but may be missing or wrong at the JSON layer.
          base: typeof d.b === 'string' ? d.b : 'white',
          dSat: typeof d.s === 'number' ? d.s : 0,
          dLit: typeof d.l === 'number' ? d.l : 0,
          alpha: typeof d.a === 'number' ? d.a : 1,
        }))
      : [],
    components: Array.isArray(o.components)
      ? o.components.map((c) => ({
          id: nextId(),
          source: typeof c.s === 'string' ? c.s : '',
        }))
      : [],
  };
}

/** Encode a workspace into the URL-hash payload string (no leading `#`). */
export async function encodeStateToHash(state: WorkspaceState): Promise<string> {
  const json = JSON.stringify(toSerializedV1(state));
  return compressToBase64(json);
}

/**
 * Decode a URL-hash payload back into a workspace. Strips a leading `#`
 * if present so callers can pass `location.hash` directly. Returns
 * `null` for empty input or any decode/parse failure.
 */
export async function decodeStateFromHash(hash: string): Promise<WorkspaceState | null> {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    const json = await decompressFromBase64(raw);
    const obj: unknown = JSON.parse(json);
    return fromSerialized(obj);
  } catch {
    return null;
  }
}
