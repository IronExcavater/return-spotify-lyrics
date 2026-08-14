# UI Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add improved Fade and Marquee primitives based on the original extension, and simplify Resizable so persistence lives outside the component while all eight resize handles are independently controllable and visually discoverable.

**Architecture:** `Fade` remains a small mask-based wrapper. `Marquee` keeps measurement/observer-driven behaviour and CSS animations, but owns its internal viewport so consumer padding/margins behave normally and clone count can be fixed or automatic. `Resizable` becomes a pure UI primitive that emits change callbacks; popup persistence stays in the app layout storage module.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, WXT Storage.

## Global Constraints

- Keep UI primitives domain-free and dependency-light.
- Preserve the original Marquee left/right/bounce behaviour, hover activation, offscreen pausing, dynamic measurement and interaction mirroring.
- `Fade` supports left/right/top/bottom/horizontal/vertical/all and follows the component's border radius.
- `Resizable` must not know about WXT storage.
- `Resizable` supports all eight handles and lets callers disable any subset.
- Prefer plain readable props over generic sizing type abstractions.

---

### Task 1: Fade

**Files:**

- Create: `src/ui/Fade.tsx`
- Create: `src/ui/Fade.test.tsx`

**Interfaces:**

- Produces: `Fade`, `FadeDirection`.

- [ ] Write tests for each direction, disabled state, numeric/CSS fade size, and rounded class passthrough.
- [ ] Verify the tests fail because `Fade` does not exist.
- [ ] Implement mask-gradient composition on the same rounded/overflow-hidden element.
- [ ] Run the focused tests.
- [ ] Commit.

### Task 2: Marquee

**Files:**

- Create: `src/ui/Marquee.tsx`
- Create: `src/ui/marquee.css`
- Create: `src/ui/Marquee.test.tsx`

**Interfaces:**

- Produces: `Marquee`, `MarqueeMode`, helper functions for copy count and travel calculation.

- [ ] Write failing tests for overflow/force decisions, automatic copy count, continuous travel distance and static rendered structure.
- [ ] Implement the measurement model with a dedicated inner viewport so outer margin/padding remain normal CSS hierarchy.
- [ ] Preserve left/right/bounce, hover-only animation, reduced-motion behaviour, offscreen pausing, resize observation and animation reset.
- [ ] Support `force`, numeric `copies`, `copies="auto"`, separator customization and generalized mirrored events across visible copies.
- [ ] Run focused tests.
- [ ] Commit.

### Task 3: Resizable

**Files:**

- Modify: `src/ui/Resizable.tsx`
- Modify: `src/ui/Resizable.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/layout/popupSizeStorage.ts`

**Interfaces:**

- `Resizable` produces `onChange`, `onChangeStart`, `onChangeEnd` callbacks and accepts `disabledHandles`.
- `popupSizeStorage.ts` owns the persistence helper used by `AppShell`.

- [ ] Update tests first for no storage prop, callback naming, per-handle disabling and visual handle markup.
- [ ] Remove persistence logic from `Resizable`.
- [ ] Add `disabledHandles` while retaining axis-level `resize` modes.
- [ ] Add subtle visible grip indicators and larger hover/active hit areas.
- [ ] Move popup-size persistence into `popupSizeStorage.ts` and call it from `AppShell.onChangeEnd`.
- [ ] Run focused tests.
- [ ] Commit.

### Task 4: Verification

**Files:**

- No product-code changes unless verification exposes a defect.

- [ ] Run `pnpm check`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] Verify WXT emits popup, sidepanel, background and manifest outputs.
