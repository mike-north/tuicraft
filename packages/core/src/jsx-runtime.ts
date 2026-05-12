// Minimal JSX runtime: h() + Fragment, the two things our compiled
// TSX templates need to construct the virtual element tree that
// render.ts walks to produce ANSI.
//
// The tree shape is intentionally tiny — every node is either a string,
// a number, or an object with { __k: true, tag, props, children }. The
// renderer pattern-matches on `tag` to decide what SGR/control codes to
// emit. There is no diffing, no reconciliation, no hooks — components
// are just functions that return trees.

/** Anything that may appear as a child in the JSX tree. */
export type JSXNode =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSXElement
  | readonly JSXNode[];

/**
 * A function-valued JSX tag (a "component"). `P` is the author's own
 * prop shape; the renderer always also passes `children`.
 *
 * The runtime can't statically verify that the props passed to `h(C, ...)`
 * match the component's declared props (TSX is evaluated dynamically here,
 * post-Monaco-emit), so we use the same compromise React's `createElement`
 * makes: the tag-level signature accepts `any` props, and individual
 * components narrow as they please.
 */
// Permissive props on purpose — see jsdoc above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JSXFunctionComponent<P = any> = (props: P & { children: JSXNode[] }) => JSXNode;

/** Tag values supported by the runtime. */
export type JSXTag = string | JSXFunctionComponent | typeof Fragment;

/** Internal tree node produced by `h()` / `Fragment`. */
export interface JSXElement {
  readonly __k: true;
  tag: JSXTag;
  props: Record<string, unknown>;
  children: JSXNode[];
}

/** Type guard for {@link JSXElement} values. */
export function isJSXElement(v: unknown): v is JSXElement {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { __k?: unknown }).__k === true
  );
}

export function Fragment(props: { children?: JSXNode[] } = {}): JSXElement {
  return { __k: true, tag: Fragment, props, children: props.children ?? [] };
}

export function h(
  tag: JSXTag,
  props: Record<string, unknown> | null,
  ...kids: JSXNode[]
): JSXElement {
  const flat: JSXNode[] = [];
  const stack: JSXNode[] = [...kids];
  while (stack.length) {
    const x = stack.shift();
    if (x == null || x === false || x === true) continue;
    if (Array.isArray(x)) {
      stack.unshift(...(x as JSXNode[]));
      continue;
    }
    flat.push(x);
  }
  return { __k: true, tag, props: props ?? {}, children: flat };
}
