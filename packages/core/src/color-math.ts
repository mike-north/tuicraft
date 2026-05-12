// Color math used by the derived palette. Derivation is done in HSL —
// close enough for design work, and intuitive — then optionally
// alpha-blended against the active theme's background hex (a poor man's
// compositing that matches how chromaterm "derives" colors from the
// terminal's actual background and ANSI mapping).

export type Rgb = readonly [r: number, g: number, b: number];
export type Hsl = readonly [h: number, s: number, l: number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Apply a derived-color transform to a base hex against a background hex.
 *
 * @param baseHex - The ANSI base color, as `#rrggbb`.
 * @param bgHex - The active theme's background, used for alpha compositing.
 * @param dSat - Saturation delta in [-100, 100].
 * @param dLit - Lightness delta in [-100, 100].
 * @param alpha - Final blend ratio with `bgHex`, in [0, 1]. `1` means no blend.
 */
export function applyDerivation(
  baseHex: string,
  bgHex: string,
  dSat: number,
  dLit: number,
  alpha: number,
): string {
  const [r, g, b] = hexToRgb(baseHex);
  const [h, s0, l0] = rgbToHsl(r, g, b);
  const s = clamp(s0 + dSat, 0, 100);
  const l = clamp(l0 + dLit, 0, 100);
  let [r2, g2, b2] = hslToRgb(h, s, l);
  if (alpha < 1) {
    const [br, bg2, bb] = hexToRgb(bgHex);
    const a = clamp(alpha, 0, 1);
    r2 = r2 * a + br * (1 - a);
    g2 = g2 * a + bg2 * (1 - a);
    b2 = b2 * a + bb * (1 - a);
  }
  return rgbToHex(r2, g2, b2);
}
