// Tiny DOM helpers. Strict-mode TS makes `document.getElementById(...)!`
// pervasive otherwise — these helpers centralize the assertion and
// give us nicer error messages when an id goes missing.

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required DOM element: #${id}`);
  return el;
}

/** Like {@link $}, but returns null instead of throwing. */
export function $maybe(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/** Typed input/checkbox/etc. lookup — narrows to a specific element subclass. */
export function $as<E extends HTMLElement>(id: string, ctor: new () => E): E {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required DOM element: #${id}`);
  if (!(el instanceof ctor)) {
    throw new Error(`#${id} is not a ${ctor.name}, got ${el.constructor.name}`);
  }
  return el;
}

/** Same as {@link $as} but returns null when the element is missing. */
export function $asMaybe<E extends HTMLElement>(id: string, ctor: new () => E): E | null {
  const el = document.getElementById(id);
  if (!el) return null;
  return el instanceof ctor ? el : null;
}

export function setText(id: string, value: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

/** A <span>x</span> with an optional class. Convenience for sidebar building. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Format a numeric pixel value as a CSS string. Avoids `number + 'px'` lint. */
export function px(n: number): string {
  return `${String(n)}px`;
}

/** Pad a 1-indexed counter to two digits. */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
