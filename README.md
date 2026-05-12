# tuicraft

A studio for designing terminal UI components.

Define a component's TypeScript interface and JSX-style template once, then audition it across themes, fonts (including Nerd-Font icon glyphs), and a user-derived color palette — live, in [xterm.js](https://xtermjs.org/).

## Repository layout

```
apps/
  studio/              # Vite SPA — deploys to Vercel
packages/
  core/                # @tuicraft/core — pure DSL: themes, JSX → ANSI renderer, color math, state model
```

## Getting started

```sh
# Install
pnpm install

# Develop the studio
pnpm dev

# Type-check, lint, test, and build everything
pnpm check
```

## Workspace tasks

| Task         | What it does                                              |
|--------------|-----------------------------------------------------------|
| `pnpm dev`         | Run the studio app in Vite dev mode                  |
| `pnpm build`       | Build all packages and apps                          |
| `pnpm typecheck`   | Type-check every workspace                           |
| `pnpm lint`        | ESLint, strict-type-checked rules                    |
| `pnpm test`        | Vitest across all workspaces                         |
| `pnpm format`      | Prettier write                                       |
| `pnpm check`       | All of the above (lint → typecheck → test → build)   |

## Architecture

- `apps/studio` is a vanilla-TypeScript Vite SPA. It loads Monaco for the editor and xterm.js for the previews, and persists the entire workspace state to the URL hash so "share URL" is "share workspace."
- `packages/core` is a pure, side-effect-free library: themes, fonts, color math, JSX runtime, ANSI renderer, ambient-`.d.ts` generator, workspace-state types, URL-hash codec. No DOM, no Monaco — testable in isolation.

## Deploys

| Surface         | Host    |
|-----------------|---------|
| `apps/studio`   | Vercel  |

## License

Private / unreleased.
