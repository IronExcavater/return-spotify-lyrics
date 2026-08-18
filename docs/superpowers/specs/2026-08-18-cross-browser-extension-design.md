# Cross-Browser Extension Design

## Goal

Make the WXT rewrite a genuinely cross-browser extension from one React codebase, with browser-specific differences isolated to build configuration and a small platform adapter.

The supported targets for this pass are:

- Chromium / Chrome
- Edge
- Firefox and Gecko-based browsers
- Opera
- Safari

The persistent UI concept is a generic **sidebar** rather than a Chrome-specific side panel. Browsers that support a native extension sidebar should render the same sidebar application. Safari should remain fully usable through the popup even though it does not currently expose an equivalent WebExtension sidebar API.

Document Picture-in-Picture remains a documented future option only. This pass does not implement a PiP runtime or add PiP as an application surface.

## Principles

- One React application, not one app per browser.
- Browser-specific code belongs in `platform/browser`, WXT configuration, or entrypoint metadata.
- Application components should not branch on `chrome`, `browser`, `opr`, Firefox, Safari, or browser names.
- Prefer capability detection for runtime behaviour and target detection only where the generated manifest must differ.
- Keep Manifest V3 across the supported builds to avoid maintaining two architectural models.
- The sidebar and popup should share routing, providers, queries, integrations, UI components, and feature code.
- Unsupported features degrade cleanly instead of preventing the extension from loading.

## Application surfaces

Rename the semantic surface model from:

```ts
'popup' | 'sidepanel';
```

to:

```ts
'popup' | 'sidebar';
```

`sidebar` describes the product surface, not the browser API that hosts it.

The physical WXT `sidepanel` entrypoint may remain named `sidepanel` because WXT recognises that convention and maps it to Chrome's `side_panel` and Firefox's `sidebar_action` generation. Its React entrypoint should mount the semantic `sidebar` surface.

Safari does not mount the sidebar surface in this pass.

Picture-in-Picture is deliberately not added to `Surface` yet. When implemented later, it may become a third application surface if the full application is rendered into it.

## Browser matrix

### Chromium / Chrome

- Manifest V3.
- Popup enabled.
- WXT sidepanel entrypoint enabled.
- Generated `side_panel.default_path` points to the shared sidebar document.
- Runtime opening uses `sidePanel.open()` when the API exists and the call originates from a valid user gesture.

### Edge

- Manifest V3.
- Same application and sidebar behaviour as Chromium.
- Build as a distinct WXT `edge` target for validation and future store packaging.
- Runtime still relies on the Chromium side panel capability rather than browser-name checks.

### Other Chromium-based browsers

The Chrome/Chromium build should remain usable in Chromium forks.

If `chrome.sidePanel` / the WXT-normalised equivalent exists, the extension may use the native Chromium sidebar path. If it does not exist, the popup remains functional.

Do not create per-browser forks for Brave, Vivaldi, Arc, or other Chromium browsers unless an actual incompatibility requires one.

### Firefox / Gecko

- Manifest V3.
- Popup enabled.
- WXT sidepanel entrypoint enabled and emitted through Firefox's `sidebar_action` manifest mechanism.
- Runtime opening uses `sidebarAction.open()` from a user gesture where available.
- The same `sidebar.html` application content is used as Chromium.
- Firefox-specific manifest requirements, including extension identity or data-collection declarations if required by current store tooling, belong in WXT configuration rather than feature code.

### Opera

Opera requires special handling because its documented sidebar system is `sidebar_action` / `opr.sidebarAction`, while WXT's standard sidepanel mapping primarily targets Chrome-style `side_panel` and Firefox-style `sidebar_action`.

For Opera:

- Build a distinct WXT `opera` target.
- Emit a normal popup.
- Emit the same sidebar React application as a normal extension HTML page.
- Add Opera's `sidebar_action` manifest entry pointing at that shared sidebar document.
- Do not assume Chrome's `sidePanel` API is available.
- Runtime Opera-specific sidebar calls, if needed, are isolated behind the browser adapter.
- Do not assume a programmatic `open()` API exists for Opera. If the installed Opera API only exposes panel configuration and the browser sidebar icon/command controls opening, expose the sidebar normally and let Opera own that interaction.
- Opera MV3 sidebar behaviour must be manually verified before release because Opera's public sidebar documentation still contains older MV2-oriented examples.

The Opera implementation must not introduce a second React sidebar implementation.

### Safari

- Manifest V3.
- Popup enabled.
- No sidebar entrypoint or sidebar manifest key in this pass.
- The same React popup application remains the complete usable product surface.
- Unsupported Safari APIs must be absent or guarded.
- Safari-specific packaging is outside WXT's normal store ZIP flow and remains a later distribution step through Apple's Safari Web Extension packaging/App Store process.

Safari does not support the WebExtension `identity` API. Authentication code must therefore not require `browser.identity` as its only OAuth path. The platform auth boundary should allow a normal-tab OAuth flow for Safari when Spotify OAuth is implemented.

Current Firebase custom-token/background messaging foundations can remain browser-neutral as long as they do not introduce an `identity` dependency.

## Entrypoints

Keep one popup entrypoint.

Use one shared sidebar mounting path. The implementation may use:

- WXT's recognised `sidepanel` entrypoint for Chrome, Edge, and Firefox, mounting `mountApp('sidebar')`.
- A small Opera-only HTML entrypoint that imports the same sidebar bootstrap if WXT cannot emit Opera's required `sidebar_action` manifest from the recognised sidepanel entrypoint without also producing an incompatible `side_panel` key.

If an Opera-only HTML entrypoint is necessary, it is a build adapter only. It must not contain duplicate application logic.

Safari excludes sidebar entrypoints.

## Browser platform layer

Add a narrow browser compatibility layer under:

```text
apps/extension/src/platform/browser/
├─ capabilities.ts
├─ sidebar.ts
└─ auth.ts
```

### `capabilities.ts`

Expose application-meaningful capabilities, for example:

```ts
type BrowserCapabilities = {
    sidebar: boolean;
    programmaticSidebarOpen: boolean;
    documentPictureInPicture: boolean;
};
```

The exact shape may remain small and should only include capabilities that the application currently needs.

Capability values should prefer actual API presence over browser-name heuristics.

`documentPictureInPicture` is exposed only as future-facing capability information in this pass. No PiP UI is enabled from it yet.

### `sidebar.ts`

Expose a small API such as:

```ts
openSidebar(): Promise<SidebarOpenResult>
```

The adapter resolves the available implementation:

- Chromium/Edge: `sidePanel.open(...)`
- Firefox/Gecko: `sidebarAction.open()`
- Opera: use only functionality actually available from `opr.sidebarAction`; if programmatic opening is unavailable, return a typed unsupported/manual result rather than throwing an opaque error.
- Safari: unsupported.

The popup and other React components should call this adapter rather than browser APIs directly.

### `auth.ts`

This is a compatibility boundary, not a new auth framework.

It should establish where browser-specific OAuth launching behaviour belongs so Safari can use a normal tab rather than `identity` when Spotify OAuth is implemented.

Do not rewrite the current Firebase/custom-token integration merely to fill this file. Add only the browser-auth behaviour required by existing or immediately implemented flows.

## Sticky UI behaviour

The product-level concept is **sidebar** or **sticky view**, not Chrome's "side panel".

The popup may expose one sidebar/sticky action when a native sidebar is available.

Behaviour:

- Chromium/Edge with programmatic side-panel support: open the native sidebar from the user gesture.
- Firefox/Gecko with `sidebarAction.open()`: open the native sidebar from the user gesture.
- Opera: if programmatic opening is unsupported, the application should not fake success. The browser's sidebar entry remains installed and discoverable; UI copy may explain that it can be opened from Opera's sidebar.
- Safari: hide or disable the sidebar/sticky action because there is no equivalent sidebar surface in this pass.

Do not use PiP as an automatic fallback in this implementation.

## Picture-in-Picture future option

Document Picture-in-Picture remains documented as a future floating-window mode.

Planned flow:

```text
persistent sidebar
    -> user chooses Float
    -> documentPictureInPicture.requestWindow()
    -> render selected Return Spotify Lyrics UI into PiP
```

The sidebar is the intended opener because it is a persistent document and can satisfy the user-activation requirement directly.

This pass does not:

- call `documentPictureInPicture.requestWindow()`
- add a PiP provider
- add a PiP React portal
- add `pip` to `Surface`
- add a production Float button
- attempt an offscreen/background host workaround

A future implementation may render either a dedicated player or the full application depending on the final design.

## WXT configuration

Set the project's intended target browser names explicitly so build-time browser environment values are typed and intentional:

```text
chrome
edge
firefox
opera
safari
```

Keep `manifestVersion: 3` to maintain one extension architecture across targets.

Convert the manifest configuration to target-aware function form where browser-specific keys or permissions are required.

Use WXT entrypoint include/exclude metadata and manifest generation rather than runtime code to avoid shipping unsupported sidebar declarations to Safari.

Opera's `sidebar_action` addition should be generated only for the Opera target.

## Package scripts

The extension workspace should provide explicit development/build commands for the important targets, with root Turbo convenience scripts where useful.

Expected build coverage:

```text
chrome
edge
firefox
opera
safari
```

The default `build` task should remain suitable for Turbo orchestration. A separate cross-browser verification command may build all five targets sequentially so one package task does not overwrite another target's output unexpectedly.

Do not add another monorepo tool.

## CI

CI remains PR/`main` only with concurrency cancellation.

Cross-browser verification should confirm at minimum:

- Chrome build succeeds.
- Edge build succeeds.
- Firefox MV3 build succeeds.
- Opera build succeeds.
- Safari MV3 build succeeds.
- Chrome/Edge manifest contains the expected Chrome-style side panel declaration.
- Firefox manifest contains the expected Firefox sidebar declaration.
- Opera manifest contains the expected Opera sidebar declaration and does not rely on an unavailable Chrome side-panel declaration for its sidebar.
- Safari manifest does not declare the unsupported sidebar surface.
- Popup output exists for every target.
- Shared sidebar application output exists for the targets that support it.

Do not add feature-branch push triggers just to perform this work.

## Testing

Add focused unit tests around pure browser capability and sidebar-resolution logic rather than attempting to fully emulate browser chrome.

Test cases should include:

- Chromium sidePanel capability detected.
- Firefox sidebarAction capability detected.
- Opera sidebar capability represented without assuming programmatic opening.
- Safari/no-sidebar capability represented as unsupported.
- Sidebar adapter returns a typed result for unsupported/manual-open cases.
- Existing popup/sidebar surface layout tests updated for the semantic `sidebar` rename.

Build-level manifest assertions provide the browser-specific integration tests.

Manual release verification remains required for:

- Opera sidebar installation/opening under current Opera MV3.
- Safari packaging and authentication once the OAuth flow is implemented.

## Definition of done

This pass is complete when:

- the application surface is renamed from `sidepanel` to `sidebar`
- Chromium/Chrome and Edge produce working native side-panel builds
- Firefox/Gecko produces a native sidebar build using the same React application
- Opera produces a sidebar-enabled build using the same React application, with browser-specific manifest/API differences isolated
- Safari produces a clean MV3 popup build without unsupported sidebar assumptions
- browser capability/sidebar logic is isolated under the platform layer
- application components do not contain browser-brand branching
- all five target builds pass automated verification
- existing tests, typecheck, Oxlint, Prettier, Storybook, and site builds remain green
- PiP remains documented but unimplemented
- CI remains PR/`main` only and does not spam feature-branch pushes
