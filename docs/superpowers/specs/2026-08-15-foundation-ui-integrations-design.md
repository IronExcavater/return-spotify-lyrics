# Foundation UI and Integrations Design

## Goal

Add the second foundation layer for Return Spotify Lyrics without recreating the complexity of the old app. The implementation should prefer well-supported primitives and small focused modules over custom frameworks, generic repositories, or duplicated component variants.

## Scope

This pass covers:

- application error handling and an ErrorPage
- typed background messaging
- basic Spotify, LRCLIB, and Firebase integration boundaries
- auth/query foundations
- app storage helpers
- a unified Skeleton primitive
- a compact reusable UI component set
- a persistent portal-slot helper
- intentionally basic app pages and bars

This pass does not implement final product visuals, complete Spotify feature coverage, production backend auth infrastructure, final Firestore schemas, or final page layouts.

## Dependencies

Add only dependencies that materially remove code:

- `firebase`
- `@webext-core/messaging`
- `react-error-boundary`
- `lucide-react`

Continue using existing Base UI, TanStack Query, TanStack Store, TanStack Virtual, WXT Storage, `idb`, React Router, Tailwind, and `clsx`.

Do not add Axios, Zod, CVA, shadcn, Zustand, Redux, a form library, a toast library, or a generic service/repository framework.

## Runtime boundaries

UI surfaces do not call Spotify, LRCLIB, or Firebase clients directly.

```text
React feature
  -> TanStack Query / mutation
  -> typed extension message
  -> background handler
  -> integration client / IndexedDB / Firebase
```

The background entrypoint only registers handlers. Integration-specific code stays under `src/integrations`.

## Errors

Create a small `AppError` model with:

- `code`
- `message`
- optional `cause`
- optional `retryAfter`

Use stable namespaced codes such as:

- `network.offline`
- `auth.required`
- `auth.reauthorization_required`
- `spotify.rate_limited`
- `spotify.no_active_device`
- `spotify.premium_required`
- `lyrics.not_found`
- `lyrics.publish_failed`

Unknown thrown values are normalized once with an `asAppError` helper.

`AppErrorBoundary` combines `react-error-boundary` with TanStack Query's `QueryErrorResetBoundary`. React Router uses a root error element/component that renders the same `ErrorPage` visual language.

`ErrorPage` supports useful actions where available: retry, back, home, reload. Technical details are only shown in development.

## Messaging

Use `@webext-core/messaging` with one typed protocol definition. Keep message names concrete rather than creating a command bus.

Initial message groups:

- auth: session, login, logout
- Spotify: playback snapshot and basic control/read request foundations
- lyrics: lookup/search foundation

Handlers may initially return placeholders or controlled `not_configured` errors where backend credentials are intentionally absent.

## Integrations

### Spotify

Use a small custom `spotifyFetch<T>()` client rather than the Spotify Web API SDK. It handles:

- bearer access token
- JSON responses
- no-content responses
- AbortSignal
- 401/403/404/429 normalization
- Retry-After

Endpoint modules stay small: `player.ts`, `media.ts`, and later additional files only as features need them.

Access-token retrieval is supplied to the client rather than importing React or global UI state.

### LRCLIB

Use a direct typed fetch adapter with initial `get` and `search` support. Normalize responses into app-owned types rather than exposing arbitrary API objects throughout the app.

### Firebase

Use Firebase's web-extension auth entrypoint for extension-safe authentication. Keep initialization under `integrations/firebase` and out of React components.

This pass provides the client/auth boundary and custom-token sign-in support. It does not store Spotify refresh tokens in the extension and does not invent production backend secrets.

## Storage

Use WXT Storage directly for small persisted state. `platform/storage.ts` declares typed items such as preferences/session-adjacent UI settings. Avoid a generic storage class.

Use IndexedDB through the existing `idb` database only for larger/durable cache data and drafts.

## TanStack Query

Keep one QueryClient factory with sensible global defaults. Feature query files own keys, stale times, and mutations.

Auth gets an initial session query and login/logout mutations using typed messaging. Remote Spotify/LRCLIB/Firebase data must not be copied into TanStack Store.

TanStack Store remains for client-owned live UI state only.

## UI component strategy

Use Base UI for accessible interaction behavior and style it through thin Return Spotify Lyrics components.

### Button

Delete the separate `IconButton` component. `Button` handles text buttons and icon-only buttons through one API.

Shared options include:

- `variant`
- `size`
- `radius`
- `icon`
- `iconOnly`
- `badge`
- `loading`
- `disabled`
- `tooltip`

Icon-only buttons require an accessible label.

### Avatar

One `Avatar` handles display-only and interactive use instead of separate `Avatar` and `AvatarButton` components.

Shared concepts with Button:

- `size`
- `radius`
- `badge`
- `loading`
- `disabled`
- `tooltip`
- interaction props

When interactive, it uses proper button semantics rather than a clickable div.

The previously-mentioned "checkatar" is interpreted as a selectable/checkable Avatar state, not a separate component. Avatar supports selected/checked presentation where required.

### Badge

Provide one reusable Badge primitive for counts, labels, and dots. Button and Avatar may expose convenience badge props that delegate to Badge.

### Skeleton

Create one `Skeleton` component only. Do not create `SkeletonText`.

The child remains the source of geometry: the skeleton wraps arbitrary child content and uses the child's layout/radius rather than requiring component-specific presets.

`hash` deterministically varies placeholder values where useful, particularly text width and shimmer offset. Equivalent hashes produce stable values across renders.

The component supports explicit overrides for width/height/radius where required, but defaults to inheriting the child's layout.

Use an animated glint/shimmer over a quiet base placeholder. Respect `prefers-reduced-motion`.

### Interactive primitives

Create styled wrappers as needed around Base UI:

- Checkbox
- Switch
- Tooltip
- Popover
- Dialog
- Menu
- Avatar
- Button
- Slider

Keep wrapper APIs small and consistent. Do not expose every Base UI implementation detail unless a real use case needs it.

### Native/styled primitives

Use normal React/HTML for:

- Badge
- Card
- List
- Separator
- Skeleton
- Spinner

These do not need headless behavior libraries.

### Portal helper

Preserve the old portal-slot capability: one mounted child can move between named anchors without remounting.

Rename/simplify the API around a `usePortal` helper returning named slots plus the portal content. The persistent host DOM node moves between anchors when the active slot changes.

## Initial component set

The initial `src/ui` foundation should contain or retain:

- Avatar
- Badge
- Button
- Card
- Checkbox
- Dialog
- Fade
- List
- Marquee
- Menu
- Popover
- Portal helper
- Resizable
- Separator
- Skeleton
- Slider
- Spinner
- Switch
- Tooltip

Components must remain independent; avoid a giant shared variants framework unless repetition later proves it necessary.

## Basic pages and bars

Add intentionally simple routes/pages for:

- Home
- Login
- Search
- Lyrics
- Queue
- Settings

Add a basic PlaybackBar feature component and keep AppBar primarily responsible for layout/composition.

These pages are scaffolds only. They should exercise the primitives and query/error/auth infrastructure without pretending to be the final design.

## Testing

Add focused unit/static-render tests for:

- AppError normalization
- deterministic Skeleton hashing and shape behavior
- Button icon-only/accessibility/badge composition
- Avatar interactive/selected/badge composition
- Portal slot persistence logic where practical
- typed integration error mapping/pure helpers
- basic route/error-page rendering

Existing WXT build verification remains required.

## Definition of done

The pass is complete when:

- the new dependencies are locked
- the app builds under WXT
- typecheck, Oxlint, Prettier, and tests pass
- popup/sidepanel/background outputs still exist
- UI surfaces communicate through typed messaging rather than direct integrations
- ErrorPage/ErrorBoundary are wired into router/query handling
- Skeleton, Button, Avatar, and the listed basic primitives are available with consistent APIs
- IconButton is removed
- basic pages and bars compile and remain deliberately minimal
