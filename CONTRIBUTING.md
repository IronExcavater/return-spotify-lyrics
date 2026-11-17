# Contributing

## Setup

Install Node.js 22 or later. Then install pnpm and the dependencies:

```sh
corepack enable
pnpm install
```

## Commands

Run these from the repository root:

```sh
pnpm --filter @return-spotify-lyrics/extension dev   # open Chrome with the extension, reload on save
pnpm --filter @return-spotify-lyrics/storybook dev   # component stories on localhost:6006
pnpm check                                           # typecheck, lint and format check
pnpm test                                            # unit tests
pnpm format:fix                                      # format every file
```

## Load a build

From `apps/extension`, build for a browser and load the folder that the build writes to `.output`:

- **Chrome:** run `pnpm build`. Open `chrome://extensions`, turn on Developer mode, select Load unpacked and pick `.output/chrome-mv3`.
- **Edge:** run `pnpm build:edge`. Open `edge://extensions`, turn on Developer mode, select Load unpacked and pick `.output/edge-mv3`.
- **Opera:** run `pnpm build:opera`. Open `opera://extensions`, turn on Developer mode, select Load unpacked and pick `.output/opera-mv3`.
- **Firefox:** run `pnpm build:firefox`. Open `about:debugging#/runtime/this-firefox`, select Load Temporary Add-on and pick `.output/firefox-mv3/manifest.json`. Firefox removes it when it closes.
- **Safari 26:** run `pnpm build:safari`. In Safari Settings, turn on Advanced > Show features for web developers. Then open Developer, select Add Temporary Extension and pick `.output/safari-mv3`. Safari removes it when it quits.

Use `zip` in place of `build` (`pnpm zip`, `pnpm zip:edge` and so on) to make the file for a store upload.

## Code

Follow [AGENTS.md](AGENTS.md). It covers the project layout, the component rules, the code style, and how to write names and comments.

## Pull requests

1. Branch from `main`, and name the branch `<ticket>/<title>`, e.g. `iro-11/create-portal`.
2. Write each commit message as `<reason>: <title>` in lower case, e.g. `feat: add portal component` or `bug: missing resize end handler`. The reason is `feat`, `bug`, `refactor`, `docs`, `test`, `build`, `ci` or `chore`.
3. Run `pnpm check` and `pnpm test`.
4. Open the pull request with a title in the same format. The squash merge uses that title as the commit message on `main`.

Keep each pull request to one change. It can merge when CI passes. CI runs the checks and tests, builds Storybook, and builds the extension for each browser. It attaches each build as a zip file, so you can load the pull request in a browser without building it.
