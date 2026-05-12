/**
 * Tests for URL-hash persistence.
 *
 * The codec is asymmetric — it strips session-local ids on encode and
 * generates fresh ids on decode — so a strict deep-equal round-trip is
 * not appropriate. We assert structural equality on the serialized
 * fields instead.
 */
import { describe, it, expect } from 'vitest';
import {
  encodeStateToHash,
  decodeStateFromHash,
  toSerializedV1,
  fromSerialized,
  compressToBase64,
  decompressFromBase64,
  nextId,
} from './persist.js';
import type { WorkspaceState } from './state.js';

const sample: WorkspaceState = {
  themeId: 'dracula',
  fontId: 'fira-code',
  fontSize: 16,
  nerdIcons: false,
  derived: [{ id: 'a', name: 'muted', base: 'white', dSat: -10, dLit: -20, alpha: 0.8 }],
  components: [{ id: 'b', source: 'export default defineComponent({ name: "X" })' }],
};

describe('compressToBase64 / decompressFromBase64', () => {
  it('round-trips ASCII text', async () => {
    const enc = await compressToBase64('hello world');
    expect(enc).not.toContain('+');
    expect(enc).not.toContain('/');
    expect(enc).not.toContain('=');
    const dec = await decompressFromBase64(enc);
    expect(dec).toBe('hello world');
  });
  it('round-trips Unicode text', async () => {
    const txt = '✓ — Tokyo 東京 — 🚀';
    const enc = await compressToBase64(txt);
    expect(await decompressFromBase64(enc)).toBe(txt);
  });
  it('produces a smaller output for repetitive input', async () => {
    const big = 'a'.repeat(1000);
    const enc = await compressToBase64(big);
    expect(enc.length).toBeLessThan(big.length);
  });
});

describe('toSerializedV1', () => {
  it('uses single-letter keys + omits ids', () => {
    const out = toSerializedV1(sample);
    expect(out.v).toBe(1);
    expect(out.themeId).toBe('dracula');
    expect(out.nerdIcons).toBe(0);
    expect(out.derived[0]).toEqual({ n: 'muted', b: 'white', s: -10, l: -20, a: 0.8 });
    expect(out.components[0]).toEqual({ s: sample.components[0]!.source });
  });
  it('encodes nerdIcons true as 1', () => {
    expect(toSerializedV1({ ...sample, nerdIcons: true }).nerdIcons).toBe(1);
  });
});

describe('fromSerialized', () => {
  it('rejects null / non-objects', () => {
    expect(fromSerialized(null)).toBeNull();
    expect(fromSerialized('not an object')).toBeNull();
    expect(fromSerialized(42)).toBeNull();
  });
  it('rejects an unknown schema version', () => {
    expect(fromSerialized({ v: 999 })).toBeNull();
  });
  it('falls back to defaults when fields are missing', () => {
    const decoded = fromSerialized({ v: 1 });
    expect(decoded).not.toBeNull();
    expect(decoded!.themeId).toBe('tokyo-night');
    expect(decoded!.fontId).toBe('jetbrains-mono');
    expect(decoded!.fontSize).toBe(13);
    expect(decoded!.nerdIcons).toBe(true); // missing → default true
    expect(decoded!.derived).toEqual([]);
    expect(decoded!.components).toEqual([]);
  });
  it('mints fresh ids when decoding', () => {
    const enc = toSerializedV1(sample);
    const decoded = fromSerialized(enc);
    expect(decoded!.derived[0]!.id).not.toBe('a');
    expect(decoded!.components[0]!.id).not.toBe('b');
  });
});

describe('encodeStateToHash / decodeStateFromHash', () => {
  it('round-trips a workspace through hash form', async () => {
    const hash = await encodeStateToHash(sample);
    const decoded = await decodeStateFromHash(hash);
    expect(decoded).not.toBeNull();
    expect(decoded!.themeId).toBe(sample.themeId);
    expect(decoded!.fontId).toBe(sample.fontId);
    expect(decoded!.fontSize).toBe(sample.fontSize);
    expect(decoded!.nerdIcons).toBe(sample.nerdIcons);
    expect(decoded!.derived[0]!.name).toBe('muted');
    expect(decoded!.components[0]!.source).toBe(sample.components[0]!.source);
  });
  it('strips a leading # when decoding', async () => {
    const hash = await encodeStateToHash(sample);
    const decoded = await decodeStateFromHash('#' + hash);
    expect(decoded).not.toBeNull();
  });
  it('returns null for empty input', async () => {
    expect(await decodeStateFromHash('')).toBeNull();
    expect(await decodeStateFromHash('#')).toBeNull();
  });
  it('returns null for malformed input', async () => {
    expect(await decodeStateFromHash('not-base64!@#$')).toBeNull();
  });
});

describe('nextId', () => {
  it('produces an 8-char base36 id', () => {
    const id = nextId();
    expect(id).toMatch(/^[0-9a-z]{1,8}$/);
  });
  it('produces (with high probability) distinct ids on successive calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(nextId());
    expect(set.size).toBeGreaterThan(95);
  });
});
