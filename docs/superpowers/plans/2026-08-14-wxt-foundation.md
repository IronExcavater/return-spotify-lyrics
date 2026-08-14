# WXT Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CRXJS/Radix-Themes foundation with a clean WXT React foundation shared by popup and side panel, including declarative route layout metadata, popup resizing/persistence, TanStack Query/Store, Tailwind 4 and Base UI primitives.

**Architecture:** Two WXT HTML entrypoints call one shared `mountApp(surface)` function. A hash data router stores route-level layout metadata in `handle.layout`; `useAppLayout()` combines that metadata with the immutable surface and persisted popup size. `SurfaceViewport` applies the result, while TanStack Store owns only mutable app UI state and TanStack Query owns remote async state.

**Tech Stack:** WXT, React 19, TypeScript, React Router data router, TanStack Query, TanStack Store, TanStack Virtual, Base UI, Tailwind CSS 4, WXT Storage, `idb`, Oxlint, Prettier, Vitest.

## Global Constraints

- Use `srcDir: 'src'` and explicit imports; disable WXT auto-import scanning.
- Popup and side panel are equal thin entrypoints into the same app.
- Route layout metadata lives on React Router `handle.layout`.
- Route-specific popup sizes never overwrite the remembered normal popup size.
- Use `Size<T>` and `MinMax<T>` for readable layout types.
- TanStack Store must not duplicate Query, Router or persisted storage state.
- Base UI owns primitive behaviour; `src/ui` owns styling and application-facing APIs.
- Do not add generic repositories, services, managers, global hook folders or wrapper-heavy abstractions.

---

### Task 1: Replace build/tooling foundation

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `wxt.config.ts`
- Create: `prettier.config.mjs`
- Remove obsolete CRXJS/Vite/Radix/ESLint/Stylelint configuration files after the WXT build passes.

**Interfaces:**
- Produces WXT scripts (`dev`, `build`, `zip`, `typecheck`, `lint`, `format`, `check`) and dependencies used by all later tasks.

- [ ] Replace runtime dependencies with React 19, React Router, Base UI, TanStack Query/Store/Virtual, `clsx`, `idb`.
- [ ] Replace build tooling with WXT, the React WXT module, Tailwind 4 Vite plugin, TypeScript, Oxlint, Prettier and Vitest.
- [ ] Configure WXT with `srcDir: 'src'`, `imports: false`, React module, Tailwind plugin and MV3 permissions.
- [ ] Extend `.wxt/tsconfig.json` with strict TypeScript options.
- [ ] Run `pnpm install`, `pnpm wxt prepare`, and `pnpm typecheck`.

### Task 2: Add entrypoints and shared mounting

**Files:**
- Create: `src/entrypoints/popup/index.html`
- Create: `src/entrypoints/popup/main.tsx`
- Create: `src/entrypoints/sidepanel/index.html`
- Create: `src/entrypoints/sidepanel/main.tsx`
- Create: `src/entrypoints/background/index.ts`
- Create: `src/app/mountApp.tsx`
- Create: `src/app/providers.tsx`

**Interfaces:**
- Produces `mountApp(surface: Surface): void`.
- Consumes the Surface provider and router created in later tasks.

- [ ] Add WXT popup and side-panel HTML entrypoints with `#root` and local `main.tsx` scripts.
- [ ] Make each UI entrypoint call `mountApp('popup')` or `mountApp('sidepanel')` only.
- [ ] Add a minimal WXT background entrypoint with no runtime work outside `defineBackground`.
- [ ] Compose Surface, Query, Base UI Tooltip and Router providers in the shared mount path.

### Task 3: Implement declarative surface/layout model

**Files:**
- Create: `src/app/surface/types.ts`
- Create: `src/app/surface/SurfaceProvider.tsx`
- Create: `src/app/layout/types.ts`
- Create: `src/app/layout/surfaces.ts`
- Create: `src/app/layout/useAppLayout.ts`
- Create: `src/platform/storage.ts`
- Test: `src/app/layout/useAppLayout.test.ts`

**Interfaces:**
- Produces `Surface`, `Size<T>`, `MinMax<T>`, `RouteLayout`, `AppLayout`, `useSurface()`, `useAppLayout()` and `popupSizeStorage`.

- [ ] Write resolver tests for normal remembered size, clamping, fixed route size, `auto` height, route resize policy and side-panel behaviour.
- [ ] Implement typed surface and layout models.
- [ ] Define WXT `popupSizeStorage` with a versioned fallback.
- [ ] Implement pure `resolveAppLayout(...)` and a thin `useAppLayout()` hook around it.
- [ ] Run the layout unit tests.

### Task 4: Implement typed router metadata

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/lyrics/LyricsPage.tsx`
- Create: `src/features/queue/QueuePage.tsx`
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/auth/LoginPage.tsx`

**Interfaces:**
- Produces one module-level hash data router and route `handle.layout` metadata consumed by `useAppLayout()`.

- [ ] Create `createHashRouter()` once at module scope.
- [ ] Put layout/bar policy directly on route handles.
- [ ] Add placeholder pages so each sizing policy is observable without Spotify integration.
- [ ] Ensure `useMatches()` reads only application-defined route handles.

### Task 5: Implement app runtime state and shell

**Files:**
- Create: `src/state/app.store.ts`
- Create: `src/queries/client.ts`
- Create: `src/app/AppShell.tsx`
- Create: `src/app/AppBar.tsx`

**Interfaces:**
- Produces `activeBar`, `setActiveBar`, `playbackExpanded`, `setPlaybackExpanded`, and a Query client factory.

- [ ] Create a module-level TanStack Store containing only mutable shared UI state.
- [ ] Create focused selector hooks using `useSelector`.
- [ ] Create Query defaults suitable for the shell but designed for per-query overrides later.
- [ ] Add an app shell with top bar and route outlet.
- [ ] Apply route bar policy without storing route state in TanStack Store.

### Task 6: Implement popup viewport and resizing

**Files:**
- Create: `src/app/layout/ResizeHandle.tsx`
- Create: `src/app/layout/SurfaceViewport.tsx`
- Test: `src/app/layout/resize.test.ts`

**Interfaces:**
- `ResizeHandle` consumes an axis, numeric bounds and resize callbacks.
- `SurfaceViewport` consumes `useAppLayout()` and persists only normal popup resizing.

- [ ] Test numeric resize/clamp calculations as pure functions.
- [ ] Implement pointer-capture based resize handles.
- [ ] Apply popup width/height to the document root.
- [ ] Keep side panel browser-sized.
- [ ] Persist normal popup size on resize end; never persist route overrides.

### Task 7: Add Tailwind theme and Base UI primitives

**Files:**
- Create: `src/assets/app.css`
- Create: `src/ui/Button.tsx`
- Create: `src/ui/IconButton.tsx`
- Create: `src/ui/Tooltip.tsx`
- Create: `src/ui/Slider.tsx`

**Interfaces:**
- Produces styled application primitives; only these files directly import Base UI for the implemented primitive types.

- [ ] Add Tailwind 4 CSS-first semantic tokens.
- [ ] Add Base UI-backed Button, IconButton, Tooltip and Slider with accessible labels.
- [ ] Use the primitives in the starter pages/app bar to verify composition.

### Task 8: Add IndexedDB bootstrap and verification

**Files:**
- Create: `src/platform/database.ts`
- Modify: `.gitignore`
- Delete obsolete source/config files from the old CRXJS implementation after successful verification.

**Interfaces:**
- Produces typed IndexedDB stores for future durable cache and lyrics drafts without adding repository abstractions.

- [ ] Create a minimal `idb` schema with cache and lyrics-draft stores.
- [ ] Run `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test`, and `pnpm build`.
- [ ] Confirm WXT emits both `popup.html` and `sidepanel.html` plus the MV3 background service worker.
- [ ] Remove obsolete CRXJS/Radix/patch configuration and old source tree from the rewrite branch only.
- [ ] Re-run the complete verification suite.
