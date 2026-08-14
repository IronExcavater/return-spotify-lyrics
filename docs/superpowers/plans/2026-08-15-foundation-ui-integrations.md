# Foundation UI and Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the second reusable foundation layer: integrations/auth/error handling, a compact UI primitive set, and intentionally-basic routes/bars without recreating the old app's complexity.

**Architecture:** UI surfaces talk to typed background messages; the background owns Spotify/LRCLIB/Firebase integration calls. TanStack Query owns remote state, TanStack Store remains UI-only, WXT Storage owns small persisted settings, and Base UI supplies accessible behavior under thin styled components.

**Tech Stack:** WXT, React 19, React Router 8, TypeScript 7, Tailwind 4, Base UI, TanStack Query/Store/Virtual, WXT Storage, idb, Firebase, @webext-core/messaging, react-error-boundary, lucide-react, Vitest.

## Global Constraints

- Add only `firebase`, `@webext-core/messaging`, `react-error-boundary`, and `lucide-react`.
- Do not add Axios, Zod, CVA, shadcn, Zustand, Redux, a form library, a toast library, or a generic service/repository framework.
- UI surfaces must not import Spotify, LRCLIB, or Firebase clients directly.
- Keep wrappers thin; use Base UI only where it removes real accessibility/interaction code.
- Keep pages and bars deliberately basic rather than recreating final product UI.
- Preserve existing Fade, Marquee, Resizable, Tailwind, router layout metadata, WXT build verification, and explicit imports.

---

### Task 1: Runtime dependencies, errors, messaging, and integration boundaries

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/entrypoints/background/index.ts`
- Create: `src/errors/AppError.ts`, `src/errors/ErrorPage.tsx`, `src/errors/AppErrorBoundary.tsx`
- Create: `src/platform/messaging.ts`, `src/platform/storage.ts`, `src/platform/logger.ts`
- Create: `src/integrations/spotify/client.ts`, `src/integrations/spotify/player.ts`, `src/integrations/spotify/types.ts`
- Create: `src/integrations/lrclib/client.ts`, `src/integrations/lrclib/types.ts`
- Create: `src/integrations/firebase/app.ts`, `src/integrations/firebase/auth.ts`
- Test: `src/errors/AppError.test.ts`, integration helper tests

**Interfaces:**
- Produces `AppError`, `asAppError`, typed extension messages, `spotifyFetch`, LRCLIB lookup/search, Firebase extension-safe auth initialization, and background handlers.

- [ ] Write failing tests for error normalization and Spotify HTTP error mapping.
- [ ] Install the four approved runtime dependencies and lock them.
- [ ] Implement minimal error, messaging, storage/logger, and integration modules.
- [ ] Register concrete background handlers; unconfigured auth returns controlled `auth.not_configured` errors rather than invented credentials.
- [ ] Run focused tests and commit.

### Task 2: Query/auth/error-boundary wiring

**Files:**
- Modify: `src/app/providers.tsx`, `src/app/router.tsx`, `src/queries/client.ts`
- Create: `src/features/auth/queries.ts`, `src/features/auth/useAuth.ts`, `src/features/auth/LoginPage.tsx`
- Test: `src/errors/ErrorPage.test.tsx`, auth/query helper tests

**Interfaces:**
- Consumes typed messaging from Task 1.
- Produces the app-wide render/query boundary, route error page, session query, login/logout mutations, and minimal login scaffold.

- [ ] Write failing static-render/error helper tests.
- [ ] Wire `QueryErrorResetBoundary` + `react-error-boundary` and the router root error boundary to the same `ErrorPage`.
- [ ] Add auth query keys/session query and login/logout mutations without mirroring remote state into TanStack Store.
- [ ] Run focused tests and commit.

### Task 3: Unified core components

**Files:**
- Modify: `src/ui/Button.tsx`, `src/ui/Tooltip.tsx`, `src/ui/Slider.tsx`
- Delete: `src/ui/IconButton.tsx`
- Create: `src/ui/Badge.tsx`, `src/ui/Avatar.tsx`, `src/ui/Skeleton.tsx`, `src/ui/Portal.tsx`
- Test: `src/ui/Button.test.tsx`, `src/ui/Avatar.test.tsx`, `src/ui/Skeleton.test.tsx`, `src/ui/Portal.test.tsx`

**Interfaces:**
- `Button`: text/icon/icon-only, variants, size/radius, badge, loading, disabled, tooltip.
- `Avatar`: display or interactive, size/radius, badge, loading, disabled, tooltip, selected state.
- `Skeleton`: arbitrary-child geometry, deterministic `hash`, explicit overrides, shimmer/glint, reduced-motion support.
- `usePortal`: persistent host moved between named slots without remounting content.

- [ ] Write failing component tests for accessible icon-only buttons, shared Badge composition, interactive Avatar, deterministic Skeleton hashing, and portal slot structure.
- [ ] Implement the smallest consistent APIs; do not introduce a variants framework.
- [ ] Remove `IconButton` and update imports.
- [ ] Run focused tests and commit.

### Task 4: Remaining reusable primitives

**Files:**
- Create: `src/ui/Card.tsx`, `src/ui/Checkbox.tsx`, `src/ui/Dialog.tsx`, `src/ui/List.tsx`, `src/ui/Menu.tsx`, `src/ui/Popover.tsx`, `src/ui/Separator.tsx`, `src/ui/Spinner.tsx`, `src/ui/Switch.tsx`
- Retain/improve: `src/ui/Tooltip.tsx`, `src/ui/Slider.tsx`
- Test: `src/ui/Primitives.test.tsx`

**Interfaces:**
- Base UI-backed: Checkbox, Switch, Tooltip, Popover, Dialog, Menu, Slider.
- Native/styled: Card, List, Separator, Spinner.

- [ ] Write failing static-render/API tests for core anatomy and accessible labels.
- [ ] Implement thin styled wrappers with small composable APIs.
- [ ] Run focused tests and commit.

### Task 5: Basic routes, pages, and bars

**Files:**
- Modify: `src/app/router.tsx`, `src/app/AppBar.tsx`
- Create: `src/features/player/PlaybackBar.tsx`, `src/features/search/SearchPage.tsx`, `src/features/lyrics/LyricsPage.tsx`, `src/features/queue/QueuePage.tsx`, `src/features/settings/SettingsPage.tsx`
- Update: `src/features/home/HomePage.tsx`, `src/features/auth/LoginPage.tsx`
- Test: route/static render tests

**Interfaces:**
- Minimal route scaffolds that exercise the primitive/query/error foundation but contain no final product behavior.

- [ ] Write failing route presence/static-render tests.
- [ ] Add simple page scaffolds and a simple PlaybackBar; keep AppBar compositional.
- [ ] Run focused tests and commit.

### Task 6: Full verification and cleanup

**Files:**
- Modify only what verification requires.

- [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test`, and `pnpm build` in CI.
- [ ] Verify `.output/chrome-mv3/popup.html`, `sidepanel.html`, `background.js`, and `manifest.json` exist.
- [ ] Confirm no direct integration imports exist under UI/features except typed messaging/auth query modules.
- [ ] Confirm `IconButton.tsx` is gone and no approved dependency constraint was violated.
- [ ] Restore CI to check-only/read-only mode after any one-time dependency/format bootstrap.
