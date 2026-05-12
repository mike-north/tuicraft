# @tuicraft/core

Pure, side-effect-free core for the [tuicraft](../../README.md) TUI component studio.

This package contains everything that doesn't touch the DOM, Monaco, or xterm: themes, fonts, color math, the JSX runtime, the ANSI renderer, workspace-state types, the ambient-`.d.ts` generator, and the URL-hash codec.

The studio app depends on it. Anything else that needs to render TUI components, validate workspace state, or generate the ambient editor types can depend on it too.

## Public API

```ts
import {
  // JSX runtime
  h,
  Fragment,
  type JSXNode,
  type JSXElement,

  // Renderer
  renderTreeToAnsi,
  type RenderContext,

  // Themes
  THEMES,
  getTheme,
  themesByVariant,
  type Theme,
  type AnsiPalette,
  type AnsiName,

  // Fonts
  FONTS,
  resolveFontFamily,
  type Font,

  // Color math
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  applyDerivation,

  // Workspace state
  type WorkspaceState,
  type DerivedColor,
  type ComponentSource,

  // Persistence (URL hash)
  encodeStateToHash,
  decodeStateFromHash,

  // Ambient .d.ts
  ambientLibSource,

  // Seed workspace
  makeSeedState,
} from '@tuicraft/core';
```

See `api-report/core.api.md` for the canonical surface.

## Development

```sh
pnpm test          # run vitest
pnpm typecheck
pnpm build         # tsc + api-extractor (--local for diff)
pnpm build:ci      # api-extractor in validation mode (no writes)
```
