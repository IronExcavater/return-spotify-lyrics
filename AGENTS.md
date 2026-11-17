# AGENTS.md

Return Spotify Lyrics is a browser extension for Spotify playback and synced lyrics. It has its own UI library.

[CONTRIBUTING.md](CONTRIBUTING.md) has the setup, the commands and the git rules. Before you finish a change, run its checks and make sure that they pass. Do not commit, push or open a pull request unless you are asked to.

## Layout

- `apps/extension`: the WXT extension. The popup and the side panel share one React app.
- `apps/storybook`: one story file for each component in `packages/ui`.
- `packages/ui`: our component library. Base UI is the only primitive library under it.
- `packages/icons`: icons as React components.

## Architecture

- Import another package by its name, such as `@return-spotify-lyrics/ui/FadeBox`, never by a relative path.
- Packages never import from apps.
- Put code that several places use in the lowest package that all of them can import. For example, `Size` lives in `packages/ui/src/geometry.ts`.
- In the extension, each feature folder owns its components, hooks and queries. There are no barrel files.
- Browser differences live in `apps/extension/wxt.config.ts`. App code checks whether an API exists, not which browser it runs in.

## Components

- Each component has its own file, with its CSS beside it: `FadeBox.tsx` and `fade-box.css`.
- TypeScript holds the logic and CSS holds the styles. Styles go inside `@layer components`, so that a consumer's `className` always wins.
- The class on the root element is the component name in kebab case, such as `.fade-box`.
- State and variants are `data-*` attributes, inner parts have a `data-part` attribute, and settings are CSS variables.
- Every interactive part works with a keyboard and has an accessible name.
- Controlled props use the Base UI names: `value`, `defaultValue` and `onValueChange`.
- In a story file, `meta` holds the shared args and render function, and each story sets only what is different.

## Code style

- Prettier formats every file, so do not format by hand.
- Do not nest. Return early, and keep a function to one or two levels of indentation.
- Move an expression into a named variable when it is more than one simple ternary.
- Do not swallow parameters. Spread the props that you do not use onto the root element, and merge `className`, `style` and event handlers instead of replacing them. Do not accept a parameter that the function does not use.
- Make code general when two or more callers need it. Do not add an abstraction for one caller.
- Write Vitest tests for pure logic only, in a `*.test.ts` file beside the code. Do not write component or snapshot tests.

## Names and comments

Names and comments follow ASD-STE100 Simplified Technical English:

- Use simple words, and always use the same word for the same thing.
- Keep a name to three words or fewer. Start a function name with a verb, such as `resolveEdges`.
- Write a comment only when the code cannot say why. Do not describe what the code does.
- Keep a comment to one line: one sentence of 20 words or fewer, in the present tense and the active voice, without `-ing` verb forms.
- Use `/** */` only on exported types, props and functions.

These words have one meaning everywhere in the code:

- **side:** `top`, `right`, `bottom` or `left`
- **corner:** the point where two sides meet, such as `top-left`
- **edge:** a side or a corner
- **surface:** the popup or the side panel
