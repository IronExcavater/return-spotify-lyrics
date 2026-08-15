# Turborepo, Storybook, and Website Design

## Goal

Restructure Return Spotify Lyrics into a small, explicit monorepo that supports three independent application surfaces: the browser extension, a Storybook component workshop, and a future public marketing/content website. Shared UI must live outside every app and remain usable by all three surfaces without importing extension internals.

## Workspace choice

Use pnpm workspaces with Turborepo. pnpm owns package linking and dependency installation; Turborepo only orchestrates and caches package scripts. Do not add Nx, Turborepo generators, remote caching, deployment adapters, or a second task runner.

The workspace root contains only cross-repository configuration, orchestration scripts, documentation, and the lockfile. Runtime application dependencies belong to the package that uses them.

## Repository structure

```text
apps/
  extension/       WXT MV3 extension
  storybook/       Storybook React + Vite workshop
  site/            Astro static public website
packages/
  ui/              reusable React UI components and shared visual theme
docs/              project and implementation documentation
```

### Import boundaries

- `apps/extension` may import `packages/ui`.
- `apps/storybook` may import `packages/ui` and selected presentational components from `apps/extension` only for stories.
- `apps/site` may import `packages/ui`.
- `packages/ui` must never import from an app.
- Apps must never import from another app in production code.
- Extension-only state, storage, messaging, Firebase, Spotify, LRCLIB, WXT, routing, and background logic remain in `apps/extension`.
- UI package imports stay explicit, for example `@return-spotify-lyrics/ui/Button`; do not add a barrel `index.ts`.

## Turborepo

Use a root `turbo.json` with the common task vocabulary `build`, `typecheck`, `lint`, `test`, and `dev`. Build tasks depend on dependency builds and cache declared outputs. Development servers are persistent and uncached. Root scripts delegate through `turbo run` and provide focused aliases for extension, Storybook, and site development.

Do not enable Vercel remote cache yet. Local Turbo caching is sufficient. CI continues to run only for `main` pushes and pull requests, with concurrency cancellation. It should use Turborepo to run repository checks/builds instead of assuming a single WXT app at the root.

## Shared UI package

Move the current reusable `src/ui` components into `packages/ui/src`. The package owns its runtime dependencies (`@base-ui/react`, `clsx`, `lucide-react`) and declares React/ReactDOM as peers.

Theme tokens move into `packages/ui/src/theme.css`. Tailwind compilation remains app-owned: each app has its own CSS entry that imports Tailwind, explicitly scans `packages/ui/src`, and imports the shared theme. Extension-only root/body sizing and overflow rules remain in the extension stylesheet.

No generic math package is added. Helpers such as `clamp`, resize arithmetic, and deterministic skeleton hashing stay domain-local. `mathjs` is intentionally excluded because the project does not need expression parsing, units, matrices, complex numbers, fractions, or arbitrary-precision numeric behavior.

## Storybook app

Use Storybook 10 React + Vite as a dedicated workspace app. It must not be bundled into the extension.

Configure:

- component stories from `packages/ui/src/**/*.stories.tsx`;
- selected app stories from `apps/extension/src/**/*.stories.tsx`;
- Autodocs globally;
- Controls and inferred prop tables;
- documentation table of contents;
- dark canvas/documentation defaults matching the product theme;
- official `@storybook/addon-a11y`;
- the real shared Tailwind/theme CSS.

Initial stories cover the reusable UI library and selected app-level presentation components. Stories should be interactive through args rather than hard-coded screenshots.

## Astro site stub

Use Astro 7 with the official React integration. The site is static by default and has no backend, CMS, authentication, analytics, deployment adapter, or database.

Initial routes:

- `/` product landing stub;
- `/changelog/` release list;
- `/changelog/[id]/` statically generated release entries;
- `/legal/privacy/` privacy placeholder;
- `/legal/terms/` terms placeholder.

Use an Astro content collection backed by Markdown files under `apps/site/src/content/changelog`. The collection schema contains `version`, `title`, `date`, and `summary`. This creates a durable path for future release notes without committing to a CMS.

The site imports shared UI only when React interactivity or visual consistency is useful; static Astro markup remains preferred for simple content.

## Extension migration

Move current WXT configuration, source, public icons, and extension package dependencies into `apps/extension`. Update aliases/imports so reusable components resolve through `@return-spotify-lyrics/ui/*`. Extension build output remains `.output` within the extension package.

The root no longer owns WXT, Firebase, React Router, TanStack, Spotify integration dependencies, or extension scripts.

## Testing and verification

The migrated extension must retain its existing Vitest tests. The UI package receives its existing component tests. Storybook must build statically. Astro must build statically. Root verification must cover:

- workspace install with frozen lockfile;
- Turbo typecheck/lint/test;
- extension production build and output files;
- Storybook static build;
- Astro static build.

## Non-goals

- final marketing design or copy;
- final legal wording;
- publishing Storybook;
- site deployment configuration;
- Turborepo remote cache;
- Nx;
- Storybook browser/Vitest addon;
- CMS integration;
- moving extension-specific integrations into shared packages;
- adding `mathjs`.
