/**
 * Tests for color math.
 *
 * @see https://en.wikipedia.org/wiki/HSL_and_HSV — definitions used for HSL.
 */
import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  applyDerivation,
  clamp,
} from './color-math.js';

describe('hexToRgb', () => {
  it('parses a 6-digit hex', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
  });
  it('expands a 3-digit shorthand', () => {
    expect(hexToRgb('#f80')).toEqual([255, 136, 0]); // 0xff, 0x88, 0x00
  });
  it('accepts hex without leading #', () => {
    expect(hexToRgb('00ff00')).toEqual([0, 255, 0]);
  });
  it('handles black', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });
  it('handles white', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });
});

describe('rgbToHex', () => {
  it('formats lowercase 6-digit hex', () => {
    expect(rgbToHex(255, 128, 0)).toBe('#ff8000');
  });
  it('zero-pads single-digit channels', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203');
  });
  it('clamps values above 255', () => {
    expect(rgbToHex(300, 128, 0)).toBe('#ff8000');
  });
  it('clamps negative values to 0', () => {
    expect(rgbToHex(-10, 128, 0)).toBe('#008000');
  });
  it('rounds floats', () => {
    expect(rgbToHex(127.7, 0, 0)).toBe('#800000');
  });
});

describe('rgb/hex round-trip', () => {
  it('survives a forward and reverse pass', () => {
    for (const hex of ['#000000', '#ffffff', '#1a1b26', '#c0caf5', '#7aa2f7']) {
      const [r, g, b] = hexToRgb(hex);
      expect(rgbToHex(r, g, b)).toBe(hex);
    }
  });
});

describe('rgbToHsl', () => {
  it('reports zero saturation for grayscale', () => {
    const [, s] = rgbToHsl(128, 128, 128);
    expect(s).toBe(0);
  });
  it('places pure red at hue 0', () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0, 1);
    expect(s).toBeCloseTo(100, 1);
    expect(l).toBeCloseTo(50, 1);
  });
  it('places pure green at hue 120', () => {
    const [h] = rgbToHsl(0, 255, 0);
    expect(h).toBeCloseTo(120, 1);
  });
  it('places pure blue at hue 240', () => {
    const [h] = rgbToHsl(0, 0, 255);
    expect(h).toBeCloseTo(240, 1);
  });
});

describe('hslToRgb', () => {
  it('renders pure red', () => {
    const [r, g, b] = hslToRgb(0, 100, 50);
    expect([Math.round(r), Math.round(g), Math.round(b)]).toEqual([255, 0, 0]);
  });
  it('renders grayscale when saturation is 0', () => {
    const [r, g, b] = hslToRgb(0, 0, 50);
    expect([Math.round(r), Math.round(g), Math.round(b)]).toEqual([128, 128, 128]);
  });
});

describe('hsl ↔ rgb round-trip', () => {
  it('survives both directions for sample colors', () => {
    for (const hex of ['#ff8000', '#7aa2f7', '#9ece6a', '#bb9af7']) {
      const [r0, g0, b0] = hexToRgb(hex);
      const [h, s, l] = rgbToHsl(r0, g0, b0);
      const [r1, g1, b1] = hslToRgb(h, s, l);
      // Round-trip can differ by 1 due to floating-point precision.
      expect(Math.abs(Math.round(r1) - r0)).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(g1) - g0)).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(b1) - b0)).toBeLessThanOrEqual(1);
    }
  });
});

describe('clamp', () => {
  it('passes values inside range through', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below the lower bound', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps above the upper bound', () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('applyDerivation', () => {
  it('returns the base color when deltas and alpha are neutral', () => {
    // dSat=0, dLit=0, alpha=1 should be (close to) identity.
    const out = applyDerivation('#7aa2f7', '#000000', 0, 0, 1);
    const [r0, g0, b0] = hexToRgb('#7aa2f7');
    const [r1, g1, b1] = hexToRgb(out);
    expect(Math.abs(r1 - r0)).toBeLessThanOrEqual(1);
    expect(Math.abs(g1 - g0)).toBeLessThanOrEqual(1);
    expect(Math.abs(b1 - b0)).toBeLessThanOrEqual(1);
  });
  it('darkens when dLit is negative', () => {
    const orig = applyDerivation('#ffffff', '#000000', 0, 0, 1);
    const dark = applyDerivation('#ffffff', '#000000', 0, -50, 1);
    const [, , lightFromHex] = rgbToHsl(...hexToRgb(orig));
    const [, , lightFromDark] = rgbToHsl(...hexToRgb(dark));
    expect(lightFromDark).toBeLessThan(lightFromHex);
  });
  it('blends toward bg when alpha < 1', () => {
    // base white, bg black, alpha 0 → fully bg → black.
    const out = applyDerivation('#ffffff', '#000000', 0, 0, 0);
    expect(out).toBe('#000000');
  });
  it('halfway alpha lands halfway between base and bg', () => {
    const out = applyDerivation('#ffffff', '#000000', 0, 0, 0.5);
    const [r, g, b] = hexToRgb(out);
    // Each channel should be ~127 (255 * 0.5).
    expect(Math.abs(r - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(b - 128)).toBeLessThanOrEqual(1);
  });
  it('clamps saturation deltas at 100', () => {
    // Raising saturation past max should not change color further.
    const a = applyDerivation('#7aa2f7', '#000000', 200, 0, 1);
    const b = applyDerivation('#7aa2f7', '#000000', 100, 0, 1);
    expect(a).toBe(b);
  });
});
