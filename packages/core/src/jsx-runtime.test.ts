import { describe, it, expect } from 'vitest';
import { h, Fragment, isJSXElement } from './jsx-runtime.js';

describe('h()', () => {
  it('creates an element with the right shape', () => {
    const el = h('fg', { color: 'red' }, 'hi');
    expect(isJSXElement(el)).toBe(true);
    expect(el.tag).toBe('fg');
    expect(el.props).toEqual({ color: 'red' });
    expect(el.children).toEqual(['hi']);
  });

  it('flattens nested arrays of children', () => {
    const el = h('span', null, ['a', ['b', ['c']]], 'd');
    expect(el.children).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops null / undefined / boolean children', () => {
    const el = h('span', null, 'a', null, undefined, false, 'b', true);
    expect(el.children).toEqual(['a', 'b']);
  });

  it('treats a missing props object as empty', () => {
    const el = h('span', null);
    expect(el.props).toEqual({});
  });
});

describe('Fragment', () => {
  it('creates an element whose tag is the Fragment function itself', () => {
    const f = Fragment({ children: ['a'] });
    expect(f.tag).toBe(Fragment);
    expect(f.children).toEqual(['a']);
  });
  it('defaults children to an empty array', () => {
    expect(Fragment().children).toEqual([]);
  });
});

describe('isJSXElement', () => {
  it('returns true for h() output', () => {
    expect(isJSXElement(h('span', null))).toBe(true);
  });
  it('returns false for plain objects, arrays, primitives, null', () => {
    expect(isJSXElement({})).toBe(false);
    expect(isJSXElement({ __k: false })).toBe(false);
    expect(isJSXElement([])).toBe(false);
    expect(isJSXElement('hi')).toBe(false);
    expect(isJSXElement(null)).toBe(false);
    expect(isJSXElement(42)).toBe(false);
  });
});
