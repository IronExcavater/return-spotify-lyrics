# Turborepo Storybook Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing WXT project into a pnpm/Turborepo workspace with a shared UI package, Storybook workshop, and Astro static-site stub while preserving extension behavior.

**Architecture:** pnpm owns `apps/*` and `packages/*`; Turborepo orchestrates common scripts. The extension remains the only package with browser-extension/runtime integrations. UI moves to `packages/ui`, Storybook consumes UI plus selected extension presentation stories, and Astro consumes UI plus Markdown changelog content.

**Tech Stack:** pnpm workspaces, Turborepo 2.10.x, WXT 0.21.x, React 19, Tailwind CSS 4, Storybook 10.5.x React/Vite, Astro 7.1.x, @astrojs/react 6.0.x, Vitest, Oxlint, Prettier.

## Global Constraints

- Do not add Nx or another task runner.
- Do not add mathjs; keep tiny arithmetic helpers domain-local.
- Apps never import other apps in production code.
- `packages/ui` never imports from an app.
- Keep explicit UI subpath imports; no `index.ts` barrel.
- Keep Storybook and site out of the extension production bundle.
- Keep the site static with no CMS/backend/deployment adapter.
- Preserve the CI rule: push verification only on `main`, PR verification on pull requests, concurrency cancellation enabled.

---

### Task 1: Create workspace orchestration and package ownership

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: root `package.json`
- Create: `apps/extension/package.json`
- Move: root WXT config, TS config, `src`, and `public` under `apps/extension`

**Interfaces:**
- Produces workspace package `@return-spotify-lyrics/extension`.
- Root scripts `dev`, `build`, `typecheck`, `lint`, `test`, `check`, `storybook`, `build:storybook`, `site`, `build:site` delegate to Turbo/package filters.

- [ ] Move extension files without changing runtime behavior.
- [ ] Split root dependencies so WXT/runtime dependencies belong to the extension package.
- [ ] Add Turbo root tasks with cached build outputs and uncached persistent dev tasks.
- [ ] Run workspace install and WXT prepare before continuing.

### Task 2: Extract reusable UI package

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Move: `apps/extension/src/ui/**` to `packages/ui/src/**`
- Create: `packages/ui/src/theme.css`
- Modify: `apps/extension/src/assets/app.css`
- Modify: extension imports using `@/ui/*`

**Interfaces:**
- Produces subpath imports such as `@return-spotify-lyrics/ui/Button` and `@return-spotify-lyrics/ui/Resizable`.
- React and ReactDOM are peers; Base UI, clsx, and Lucide remain UI implementation dependencies.

- [ ] Move UI source/tests/styles and preserve existing tests.
- [ ] Extract reusable theme variables/base control typography into `theme.css`; keep extension root/body behavior app-local.
- [ ] Update extension code/tests to use UI package subpaths.
- [ ] Verify typecheck and tests for UI + extension.

### Task 3: Add Storybook workshop

**Files:**
- Create: `apps/storybook/package.json`
- Create: `apps/storybook/tsconfig.json`
- Create: `apps/storybook/.storybook/main.ts`
- Create: `apps/storybook/.storybook/preview.ts`
- Create: `apps/storybook/.storybook/preview.css`
- Create: `packages/ui/src/*.stories.tsx`
- Create selected: `apps/extension/src/**/*.stories.tsx`

**Interfaces:**
- Storybook consumes `@return-spotify-lyrics/ui/*` and presentation-only extension components.
- `pnpm storybook` starts the workshop; `pnpm build:storybook` creates `apps/storybook/storybook-static`.

- [ ] Configure React/Vite, Autodocs, docs table of contents, Controls, dark backgrounds, and `@storybook/addon-a11y`.
- [ ] Add interactive stories for Button, Avatar, Badge, Skeleton, Checkbox, Switch, Slider, Tooltip, Popover, Dialog, Menu, Card/List, Fade, Marquee, Resizable, Spinner/Separator.
- [ ] Add app-level stories for ErrorPage and simple bars where they can render without browser-extension services.
- [ ] Build Storybook statically.

### Task 4: Add Astro public-site stub

**Files:**
- Create: `apps/site/package.json`
- Create: `apps/site/astro.config.mjs`
- Create: `apps/site/tsconfig.json`
- Create: `apps/site/src/content.config.ts`
- Create: `apps/site/src/content/changelog/0.5.0.md`
- Create: `apps/site/src/layouts/SiteLayout.astro`
- Create: `apps/site/src/styles/global.css`
- Create: `apps/site/src/pages/index.astro`
- Create: `apps/site/src/pages/changelog/index.astro`
- Create: `apps/site/src/pages/changelog/[id].astro`
- Create: `apps/site/src/pages/legal/privacy.astro`
- Create: `apps/site/src/pages/legal/terms.astro`

**Interfaces:**
- Content collection `changelog` has `version`, `title`, `date`, and `summary`.
- `pnpm site` starts Astro; `pnpm build:site` writes `apps/site/dist`.

- [ ] Configure Astro static output with official React integration.
- [ ] Define Markdown collection using Astro's glob loader and schema.
- [ ] Build a minimal but coherent landing shell/navigation/footer.
- [ ] Generate changelog index and static release pages from collection entries.
- [ ] Add clearly marked privacy/terms placeholders rather than fabricated legal text.
- [ ] Build Astro statically.

### Task 5: Workspace CI and verification

**Files:**
- Modify: `.github/workflows/verify.yml`
- Modify: `.gitignore`
- Modify: `.prettierignore` if generated outputs need exclusion

**Interfaces:**
- CI uses the root workspace and Turbo commands.
- Extension output is `apps/extension/.output/chrome-mv3/*`.
- Storybook output is `apps/storybook/storybook-static`.
- Site output is `apps/site/dist`.

- [ ] Keep `main` push + PR triggers and concurrency cancellation.
- [ ] Install with `pnpm install --frozen-lockfile`.
- [ ] Run root `pnpm check`, `pnpm test`, and `pnpm build` through Turbo.
- [ ] Verify extension popup/sidepanel/background/manifest outputs plus Storybook and Astro build directories.
- [ ] Run a final clean CI pass and confirm no feature-branch push workflow is triggered.
