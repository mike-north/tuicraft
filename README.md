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

| Task             | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `pnpm dev`       | Run the studio app in Vite dev mode                |
| `pnpm build`     | Build all packages and apps                        |
| `pnpm typecheck` | Type-check every workspace                         |
| `pnpm lint`      | ESLint, strict-type-checked rules                  |
| `pnpm test`      | Vitest across all workspaces                       |
| `pnpm format`    | Prettier write                                     |
| `pnpm check`     | All of the above (lint → typecheck → test → build) |

## Architecture

- `apps/studio` is a vanilla-TypeScript Vite SPA. It loads Monaco for the editor and xterm.js for the previews, and persists the entire workspace state to the URL hash so "share URL" is "share workspace."
- `packages/core` is a pure, side-effect-free library: themes, fonts, color math, JSX runtime, ANSI renderer, ambient-`.d.ts` generator, workspace-state types, URL-hash codec. No DOM, no Monaco — testable in isolation.

## Deploys

| Surface       | Host   | Trigger                                                          |
| ------------- | ------ | ---------------------------------------------------------------- |
| `apps/studio` | Vercel | GitHub Actions on push to `main` (prod), pull requests (preview) |

### How it works

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs three jobs:

1. **check** — `lint · typecheck · test · build` via Turborepo. Required to pass before deploy.
2. **deploy-preview** — runs on every pull request. `vercel build` + `vercel deploy --prebuilt`, then a preview URL is upserted as a PR comment.
3. **deploy-prod** — runs on every push to `main`. Same flow with `--prod`.

The Vercel build itself is driven by [`apps/studio/vercel.json`](apps/studio/vercel.json), which walks up to the repo root and runs `pnpm turbo run build --filter=studio` so workspace dependencies (`@tuicraft/core`) are built before the Vite bundle.

### One-time setup

You need a Vercel project and three GitHub repository secrets.

1. **Link the project to Vercel** (one of these):
   - **CLI**: `cd apps/studio && npx vercel link` — pick or create a project. This writes `.vercel/project.json` (gitignored) containing `orgId` and `projectId`.
   - **Dashboard**: import the repo at https://vercel.com/new, set **Root Directory** to `apps/studio`. Vercel will read `vercel.json` for the build settings.

2. **Get your IDs and a token**:
   - `orgId` and `projectId`: open `apps/studio/.vercel/project.json` after `vercel link`, or copy them from the Vercel project settings page.
   - `VERCEL_TOKEN`: create at https://vercel.com/account/tokens (Read + Write).

3. **Add three GitHub Actions secrets** at `Settings → Secrets and variables → Actions`:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

After that, every PR gets an auto-updating preview URL comment and every merge to `main` ships to production.

### Manual deploy

If you need to deploy from your laptop instead of CI:

```sh
cd apps/studio
vercel              # preview
vercel --prod       # production
```

`vercel.json` ensures the build picks up the workspace correctly either way.

## License

Private / unreleased.
