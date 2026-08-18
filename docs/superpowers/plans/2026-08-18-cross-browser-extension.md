# Cross-Browser Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify one WXT/React extension across Chrome/Chromium, Edge, Firefox/Gecko, Opera, and Safari, with one shared popup, one shared sidebar application where supported, and browser differences isolated behind WXT configuration and a narrow platform adapter.

**Architecture:** Keep the physical WXT `sidepanel` entrypoint because WXT maps it to Chrome `side_panel` and Firefox `sidebar_action`, but rename the application surface to `sidebar`. Add pure browser-capability/sidebar resolution code under `src/platform/browser`, then generate target-specific manifests/builds without browser-brand branching in React feature code. Opera gets an explicit `sidebar_action` manifest adapter; Safari excludes the sidebar and remains popup-first.

**Tech Stack:** WXT 0.21.x, React 19, TypeScript 7, Vitest 4, pnpm/Turborepo, WebExtension APIs.

**Spec:** `docs/superpowers/specs/2026-08-18-cross-browser-extension-design.md`

## Global Constraints

- One React application, not one app per browser.
- Semantic surfaces are exactly `popup | sidebar` for this pass.
- Picture-in-Picture remains documented but unimplemented.
- Manifest V3 is explicit for every target, including Firefox and Safari where WXT otherwise defaults to MV2.
- Runtime browser differences live under `apps/extension/src/platform/browser`.
- No browser-brand branching in application components.
- Opera sidebar support uses `sidebar_action` and must not assume a programmatic `open()` API.
- Safari must not ship a sidebar manifest declaration and must not rely on WebExtension `identity`.
- CI remains PR/`main` only with concurrency cancellation.
- No new monorepo/orchestration framework.

---

### Task 1: Rename the semantic sidepanel surface to sidebar

**Files:**
- Modify: `apps/extension/src/app/surface/types.ts`
- Modify: `apps/extension/src/app/layout/resolveAppLayout.ts`
- Modify: `apps/extension/src/app/layout/resolveAppLayout.test.ts`
- Modify: `apps/extension/src/entrypoints/sidepanel/main.tsx`
- Search/modify any remaining application references to the literal semantic surface `sidepanel`.

**Interfaces:**
- Produces: `export type Surface = 'popup' | 'sidebar'`.
- Physical WXT entrypoint remains `entrypoints/sidepanel`; it calls `mountApp('sidebar')`.

- [ ] **Step 1: Update the layout test first** so the browser-owned viewport case passes `surface: 'sidebar'` and expects `surface: 'sidebar'`.
- [ ] **Step 2: Run the focused layout test and verify RED** because `Surface` does not yet accept `sidebar`.
- [ ] **Step 3: Rename the semantic surface in production code** and keep popup behavior unchanged.
- [ ] **Step 4: Run the focused layout test and existing extension tests; verify GREEN.**
- [ ] **Step 5: Commit the semantic rename.**

### Task 2: Add pure browser sidebar capability resolution

**Files:**
- Create: `apps/extension/src/platform/browser/sidebar.ts`
- Create: `apps/extension/src/platform/browser/sidebar.test.ts`

**Interfaces:**

```ts
export type SidebarImplementation = 'chromium' | 'firefox' | 'opera' | 'none';

export type SidebarCapability = {
    implementation: SidebarImplementation;
    available: boolean;
    programmaticOpen: boolean;
};

export type SidebarApis = {
    sidePanelOpen?: () => Promise<void>;
    sidebarActionOpen?: () => Promise<void>;
    operaSidebarPresent?: boolean;
};

export type SidebarOpenResult =
    | { status: 'opened'; implementation: 'chromium' | 'firefox' }
    | { status: 'manual'; implementation: 'opera' }
    | { status: 'unsupported'; implementation: 'none' };

export function resolveSidebarCapability(apis: SidebarApis): SidebarCapability;
export async function openSidebar(apis?: SidebarApis): Promise<SidebarOpenResult>;
```

Runtime `openSidebar()` obtains real APIs only when `apis` is omitted. Tests inject `SidebarApis` so they do not emulate browser chrome.

Resolution priority is:
1. Chromium `sidePanel.open`
2. Firefox/Gecko `sidebarAction.open`
3. Opera `sidebarAction` presence without an assumed open method
4. none

- [ ] **Step 1: Write failing tests** for Chromium, Firefox, Opera-manual, unsupported, and `openSidebar()` typed results.
- [ ] **Step 2: Run `pnpm --filter @return-spotify-lyrics/extension test -- src/platform/browser/sidebar.test.ts` and verify RED** because the module does not exist.
- [ ] **Step 3: Implement the minimal pure resolver and runtime adapter.** Use capability detection, not user-agent strings. The runtime adapter may inspect `globalThis.chrome?.sidePanel`, `globalThis.browser?.sidebarAction`, and `globalThis.opr?.sidebarAction` through narrowly typed structural casts.
- [ ] **Step 4: Run the focused tests and full extension tests; verify GREEN.**
- [ ] **Step 5: Commit the browser sidebar adapter.**

### Task 3: Expose sidebar capability to the application without browser-brand branching

**Files:**
- Create: `apps/extension/src/platform/browser/capabilities.ts`
- Create: `apps/extension/src/platform/browser/capabilities.test.ts`
- Modify: `apps/extension/src/app/AppBar.tsx` only if a current UI location can expose a real sidebar action without inventing new design; otherwise keep the adapter available but do not add UI solely for this task.

**Interfaces:**

```ts
export type BrowserCapabilities = {
    sidebar: boolean;
    programmaticSidebarOpen: boolean;
    documentPictureInPicture: boolean;
};

export function getBrowserCapabilities(): BrowserCapabilities;
```

PiP detection is informational only: `documentPictureInPicture` is true only when the current document/window exposes that API. No PiP button/provider/runtime is added.

- [ ] **Step 1: Write failing capability tests** around injected/global API shapes or a pure helper used by `getBrowserCapabilities()`.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement capability aggregation using `resolveSidebarCapability`.**
- [ ] **Step 4: Verify focused and full extension tests GREEN.**
- [ ] **Step 5: Commit.**

### Task 4: Make the WXT sidebar entrypoint target-aware

**Files:**
- Modify: `apps/extension/src/entrypoints/sidepanel/index.html`
- Modify: `apps/extension/wxt.config.ts`

**Interfaces:**
- WXT sidepanel entrypoint is included for `chrome`, `edge`, `firefox`, and `opera`; excluded from `safari`.
- The same output document is used by all supported sidebar targets.
- Chrome/Edge rely on WXT-generated `side_panel`.
- Firefox relies on WXT-generated `sidebar_action`.
- Opera receives an explicit target-only `sidebar_action` manifest object pointing to `sidepanel.html`; it must not rely on a Chrome-only side panel declaration.
- Safari has no sidebar declaration.

- [ ] **Step 1: Add an entrypoint include declaration** to the sidepanel HTML using WXT's `manifest.include` metadata for `chrome`, `edge`, `firefox`, and `opera`.
- [ ] **Step 2: Convert `wxt.config.ts` manifest to target-aware form** only as far as needed for Opera/Safari differences. Preserve current permissions and host permissions. Add Opera `sidebar_action` only to the Opera target.
- [ ] **Step 3: Do not add Safari `identity`; current custom-token auth remains unchanged.** Add a small comment/documented compatibility boundary only if required by code clarity; do not create an unused auth abstraction.
- [ ] **Step 4: Run TypeScript/check after dependencies are prepared and fix only real target-config typing errors.**
- [ ] **Step 5: Commit target-aware entrypoint/config changes.**

### Task 5: Add explicit MV3 cross-browser build scripts

**Files:**
- Modify: `apps/extension/package.json`
- Modify: root `package.json`

**Interfaces:**

Extension scripts:

```json
{
  "dev:firefox": "wxt -b firefox --mv3",
  "build:chrome": "wxt build -b chrome --mv3",
  "build:edge": "wxt build -b edge --mv3",
  "build:firefox": "wxt build -b firefox --mv3",
  "build:opera": "wxt build -b opera --mv3",
  "build:safari": "wxt build -b safari --mv3",
  "build:browsers": "pnpm build:chrome && pnpm build:edge && pnpm build:firefox && pnpm build:opera && pnpm build:safari"
}
```

Keep `build: "wxt build"` as the normal Turbo package build so Storybook/site orchestration remains unchanged.

Root adds a convenience `build:extension:browsers` command filtering to the extension workspace.

- [ ] **Step 1: Update scripts with explicit `--mv3` for Firefox/Safari and all verification targets.**
- [ ] **Step 2: Keep normal `pnpm build` behavior unchanged.**
- [ ] **Step 3: Commit script changes.**

### Task 6: Add browser manifest/output verification

**Files:**
- Create: `apps/extension/scripts/verify-browser-builds.mjs`
- Modify: `apps/extension/package.json`

**Interfaces:**

```js
// Reads generated manifests under apps/extension/.output/<browser>-mv3/manifest.json
// Throws with a browser-specific message when a required invariant is missing.
```

Checks:
- Chrome: popup + sidepanel output; `side_panel.default_path` references `sidepanel.html`.
- Edge: popup + sidepanel output; Chrome-style `side_panel` exists.
- Firefox: popup + sidepanel output; `sidebar_action.default_panel` references `sidepanel.html`; MV3.
- Opera: popup + sidepanel output; Opera `sidebar_action.default_panel` references `sidepanel.html`; no requirement for `side_panel`.
- Safari: popup output; no `side_panel`; no `sidebar_action`; MV3.

- [ ] **Step 1: Write the verifier so it fails clearly on missing output/manifests.** This is build-integration validation; it is configuration/output code and does not require a unit-test double.
- [ ] **Step 2: Add `verify:browsers` script and run it before builds to confirm it fails from absent/stale outputs when applicable.**
- [ ] **Step 3: Run `build:browsers`, then `verify:browsers`.** Fix actual WXT manifest/output mismatches rather than weakening assertions.
- [ ] **Step 4: Commit the verifier and any required manifest corrections.**

### Task 7: Extend CI without restoring feature-branch push spam

**Files:**
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Trigger remains exactly `push: branches: [main]` plus `pull_request`.
- Existing concurrency cancellation remains.
- Existing default workspace `check`, tests, Turbo build, and output checks remain.
- Add one cross-browser extension build/verification step using `pnpm --filter @return-spotify-lyrics/extension build:browsers` followed by `verify:browsers`.

- [ ] **Step 1: Update CI without adding `rewrite/wxt-foundation` or unrestricted push triggers.**
- [ ] **Step 2: Keep frozen lockfile install.**
- [ ] **Step 3: Commit CI changes.**

### Task 8: Full verification and documentation consistency

**Files:**
- Review: `docs/superpowers/specs/2026-08-18-cross-browser-extension-design.md`
- Review: `docs/superpowers/plans/2026-08-18-cross-browser-extension.md`
- Modify only if implementation revealed a documented assumption that is false.

- [ ] **Step 1: Run full `pnpm check`.**
- [ ] **Step 2: Run full `pnpm test`.**
- [ ] **Step 3: Run normal `pnpm build` to verify extension + Storybook + Astro.**
- [ ] **Step 4: Run cross-browser extension `build:browsers` and `verify:browsers`.**
- [ ] **Step 5: Inspect generated manifests for Chrome, Edge, Firefox, Opera, Safari to ensure the verifier matches reality.**
- [ ] **Step 6: Confirm `.github/workflows/verify.yml` still has PR/`main`-only triggers and no queued feature-branch CI caused by these commits.**
- [ ] **Step 7: Record any manual release caveats accurately: Opera MV3 sidebar behavior and Safari Xcode/App Store packaging remain manual verification/distribution concerns.**
