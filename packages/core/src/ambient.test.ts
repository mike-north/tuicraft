/**
 * Tests for the ambient .d.ts generator. We assert that the generated
 * source contains the contract pieces Monaco needs — not its exact
 * formatting (which is presentation, not contract).
 */
import { describe, it, expect } from 'vitest';
import { ambientLibSource } from './ambient.js';

describe('ambientLibSource', () => {
  it('declares the AnsiColor union with all 16 names', () => {
    const src = ambientLibSource([]);
    for (const c of [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
      'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    ]) {
      expect(src).toContain(`'${c}'`);
    }
  });

  it('uses `never` for the DerivedColor union when no names are provided', () => {
    expect(ambientLibSource([])).toContain('declare type DerivedColor = never;');
  });

  it('builds a `$name` literal union from the provided names', () => {
    const src = ambientLibSource(['muted', 'subtle']);
    expect(src).toContain("declare type DerivedColor = '$muted' | '$subtle';");
  });

  it('declares JSX intrinsics for all renderer-supported tags', () => {
    const src = ambientLibSource([]);
    for (const tag of ['fg', 'bg', 'bold', 'dim', 'italic', 'underline', 'inverse', 'strike', 'line', 'span']) {
      expect(src).toContain(tag + ':');
    }
  });

  it('declares h(), Fragment, and defineComponent', () => {
    const src = ambientLibSource([]);
    expect(src).toContain('declare function h(');
    expect(src).toContain('declare const Fragment');
    expect(src).toContain('declare function defineComponent<P>');
  });
});
