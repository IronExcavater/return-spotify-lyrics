# Reusable Resizable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app-specific `SurfaceViewport` resizing implementation with one reusable `Resizable` primitive supporting all four edges and all four corners.

**Architecture:** Resize geometry stays as pure tested functions. `Resizable` is a controlled UI primitive that renders any children, applies element dimensions, and exposes eight optional pointer-capture handles. App-specific popup persistence/document sizing remains in `AppShell`; sidepanel does not use `Resizable`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, WXT Storage.

## Global Constraints

- No `SurfaceViewport` component remains.
- `Resizable` must be reusable outside the application shell.
- Support `top`, `right`, `bottom`, `left`, `top-left`, `top-right`, `bottom-left`, and `bottom-right`.
- Keep resize calculations pure and covered by unit tests.
- Route-specific popup sizing must not overwrite remembered normal popup dimensions.
- No generic resize manager/context/store.

---

### Task 1: Generalise resize geometry

**Files:**

- Modify: `src/app/layout/resize.test.ts`
- Modify: `src/app/layout/resize.ts`

**Interfaces:**

- Produces `ResizeEdge` with eight directions and `resizeSize(start, delta, edge, range)`.

- [ ] Add failing tests for right/top edges and opposite corners.
- [ ] Verify the tests fail on the current three-edge implementation.
- [ ] Implement all eight directions while preserving clamping and `auto` dimensions.
- [ ] Verify the resize tests pass.

### Task 2: Add reusable `Resizable`

**Files:**

- Create: `src/ui/Resizable.tsx`
- Modify: `src/app/layout/ResizeHandle.tsx`

**Interfaces:**

- Produces controlled `Resizable` with `size`, `range`, `edges`, `onResize`, `onResizeStart`, and `onResizeEnd` props.

- [ ] Generalise `ResizeHandle` styling to all eight directions.
- [ ] Add `Resizable` which owns pointer-driven live resizing for any wrapped element.
- [ ] Keep persistence, routing and WXT APIs out of `Resizable`.

### Task 3: Remove `SurfaceViewport`

**Files:**

- Modify: `src/app/AppShell.tsx`
- Delete: `src/app/layout/SurfaceViewport.tsx`

**Interfaces:**

- `AppShell` consumes `useAppLayout()` and uses `Resizable` only for popup layouts.

- [ ] Move popup document dimension synchronisation and WXT persistence into a small app-shell-local popup wrapper.
- [ ] Use `Resizable` directly for popup rendering and enable all eight handles according to width/height resize capability.
- [ ] Leave sidepanel browser-sized without a resize wrapper.
- [ ] Delete `SurfaceViewport`.

### Task 4: Verify

- [ ] Run formatting, TypeScript, Oxlint, unit tests, WXT production build and output verification in CI.
