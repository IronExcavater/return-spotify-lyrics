# Contributing

## Setup

Install Node.js 22 or later. Then install pnpm and the dependencies:

```sh
corepack enable
pnpm install
```

The story tests run in real browsers. Download them once, and again when Playwright updates:

```sh
pnpm --filter @return-spotify-lyrics/storybook exec playwright install chromium firefox webkit
```

## Commands

Run these from the repository root:

```sh
pnpm --filter @return-spotify-lyrics/extension dev   # open Chrome with the extension, reload on save
pnpm --filter @return-spotify-lyrics/storybook dev   # component stories on localhost:6006
pnpm check                                           # typecheck, lint, format check and unused code (Knip)
pnpm test                                            # unit tests and story tests
pnpm format:fix                                      # format every file
pnpm clean                                           # delete build output and caches
```

To rerun the story tests on save, run `pnpm exec vitest` from `apps/storybook`. Add `--project "storybook (chromium)"` to use one browser. You can also run them from the test panel at the bottom of the Storybook sidebar.

To see which code in `packages/ui` no story runs, turn on Coverage in that test panel. Or run `pnpm exec vitest run --coverage` from `apps/storybook` and open `coverage/index.html`.

`pnpm install` also adds a pre-commit hook. It lints and formats the staged files, then typechecks the workspace.

To develop in another browser, run `dev:chrome`, `dev:edge`, `dev:firefox`, `dev:opera` or `dev:safari` from `apps/extension`. Dev mode opens each browser from its default install path. If yours is somewhere else, set the path in a `web-ext.config.ts` file, as the [WXT docs](https://wxt.dev/guide/essentials/config/browser-startup.html) show. Dev mode can't open Safari, so load `.output/safari-mv3-dev` yourself.

## Load a build

From `apps/extension`, build for a browser and load the folder that the build writes to `.output`:

- **Chrome:** run `pnpm build` or `pnpm build:chrome`. Open `chrome://extensions`, turn on Developer mode, select Load unpacked and pick `.output/chrome-mv3`.
- **Edge:** run `pnpm build:edge`. Open `edge://extensions`, turn on Developer mode, select Load unpacked and pick `.output/edge-mv3`.
- **Opera:** run `pnpm build:opera`. Open `opera://extensions`, turn on Developer mode, select Load unpacked and pick `.output/opera-mv3`.
- **Firefox:** run `pnpm build:firefox`. Open `about:debugging#/runtime/this-firefox`, select Load Temporary Add-on and pick `.output/firefox-mv3/manifest.json`. Firefox removes it when it closes.
- **Safari 26:** run `pnpm build:safari`. In Safari Settings, turn on Advanced > Show features for web developers. Then open Developer, select Add Temporary Extension and pick `.output/safari-mv3`. Safari removes it when it quits.

Use `zip` in place of `build` (`pnpm zip`, `pnpm zip:edge` and so on) to make the file for a store upload.

## Code

Follow [AGENTS.md](AGENTS.md), the coding guide for people and agents. It covers the layout, architecture, TypeScript, React, components, styling, accessibility, tests, code style, and how to write names and comments.

## Pull requests

1. Branch from `main`. Name the branch `<ticket>/<title>` when the work has a Linear issue, e.g. `iro-11/create-portal`, or `<reason>/<title>` when it doesn't, e.g. `build/minor-updates`. A small fix, an update or a tooling change doesn't need an issue.
2. Write each commit message as `<reason>: <title>` in lower case, e.g. `feat: add portal component` or `bug: missing resize end handler`. The reason is `feat`, `bug`, `refactor`, `docs`, `test`, `build`, `ci` or `chore`.
3. Run `pnpm check` and `pnpm test`.
4. Open the pull request with a title in the same format. The squash merge uses that title as the commit message on `main`.
5. Answer each review comment: fix it, or reply with the reason you don't. Then resolve its thread, because `main` doesn't take a merge with an open thread.

Keep each pull request to one change. It can merge when CI passes and every review thread is resolved.

A pull request can build on another one. When the first one merges, rebase the second with `git rebase --onto origin/main <first branch>`. Then the commits that the squash merge replaced don't come back. CI runs the checks and tests, builds Storybook, and builds the extension for each browser. It attaches each build as a zip file, so you can load the pull request in a browser without building it.
