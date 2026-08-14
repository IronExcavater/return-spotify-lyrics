# WXT Foundation Design

## Goal

Rebuild Return Spotify Lyrics on WXT as one React application exposed through two UI surfaces: popup and side panel. The two WXT entrypoints are thin launchers; shared application behaviour lives outside either surface.

## Architecture

- WXT owns extension entrypoints, manifest generation, browser startup and extension storage.
- React renders the shared application.
- React Router uses a hash data router. Each route may contribute layout metadata through `handle.layout`.
- `SurfaceProvider` identifies the immutable runtime surface (`popup` or `sidepanel`).
- `useAppLayout` resolves surface constraints, persisted popup dimensions and current route metadata into one immutable `AppLayout`.
- `SurfaceViewport` applies the resolved layout. Chrome owns side-panel dimensions; the popup supports controlled resizing.
- Route-specific popup dimensions are temporary and never overwrite the remembered normal popup size.
- TanStack Query owns remote async data; TanStack Store owns shared mutable client/runtime state; TanStack Virtual is used locally by features that render genuinely large lists.
- WXT Storage owns small durable settings and popup layout. IndexedDB via `idb` is reserved for larger durable caches and lyrics drafts.
- Base UI supplies accessible unstyled primitives. The application owns a thin styled `ui/` layer using Tailwind CSS 4.

## Layout model

`Size<T>` groups width and height. `MinMax<T>` groups bounds. Popup surface configuration declares a default size and allowed range. Route metadata may specify a temporary popup width/height (`number | 'auto'`), resize policy and bar policy.

Bar policy is one of `preserve`, `home`, `playback`, or `hidden`. The router owns this route behaviour instead of a separate pathname lookup table.

Resolution order for popup layout:

1. Read the persisted normal popup size.
2. Clamp it to the surface's configured bounds.
3. Apply route-specific width/height when present.
4. Apply route-specific resize policy.
5. Resolve the bar policy.

Side-panel layout ignores popup dimensions and resizing while still respecting route-level bar policy.

## Runtime state ownership

- React local state: component-local transient state.
- React Router: current route and route metadata.
- TanStack Store: active bar and other genuinely shared mutable client state.
- TanStack Query: Spotify, LRCLIB and Firebase remote data.
- WXT Storage: popup size and small durable preferences.
- IndexedDB: large persistent cache and lyrics drafts.

## Project structure

```text
src/
├─ assets/
├─ entrypoints/
│  ├─ popup/
│  ├─ sidepanel/
│  └─ background/
├─ app/
│  ├─ layout/
│  └─ surface/
├─ features/
├─ ui/
├─ state/
├─ queries/
├─ platform/
├─ integrations/
└─ shared/
```

WXT auto-imports are disabled. Imports are explicit. Feature hooks stay with their feature instead of a global `hooks/` folder. Generic `services/`, `repositories/`, `managers/` and wrapper-heavy abstractions are not introduced.

## Initial foundation scope

The first implementation contains:

- WXT React project configuration with `srcDir: 'src'`.
- Popup and side-panel HTML entrypoints.
- Shared mount and provider composition.
- Hash data router with typed route layout metadata.
- Shared app shell with home/playback bar and route content outlet.
- Popup layout persistence and resize handles.
- TanStack Query client.
- TanStack Store app state.
- WXT Storage declarations.
- IndexedDB bootstrap.
- Tailwind CSS 4 theme.
- Base UI-backed Button, IconButton, Tooltip and Slider primitives.
- Placeholder Home, Lyrics, Queue, Settings and Login pages so routing and route sizing can be exercised before Spotify/Firebase integration.

Spotify authentication, playback networking, Firebase and LRCLIB behaviour are intentionally outside this foundation slice and will be added as subsequent vertical features.