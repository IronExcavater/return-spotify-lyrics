# AGENTS.md

Return Spotify Lyrics is a browser extension for Spotify playback and synced lyrics, built on its own UI library.

Setup, commands and git rules are in [CONTRIBUTING.md](CONTRIBUTING.md). Before you call a change done, make sure `pnpm check` and `pnpm test` pass. Don't commit, push or open a pull request unless you're asked to.

## Layout

| Path             | What it holds                                                    |
| ---------------- | ---------------------------------------------------------------- |
| `apps/extension` | The WXT extension. The popup and side panel share one React app. |
| `apps/storybook` | A story file for every component in `packages/ui`.               |
| `packages/ui`    | The component library. Base UI is its only primitive library.    |
| `packages/icons` | Icons as React components.                                       |

## Architecture

- Import other packages by name, like `@return-spotify-lyrics/ui/FadeBox`, never by relative path. Packages never import from apps.
- Shared code goes in the lowest package that every user of it can import. That's why `Size` lives in `packages/ui/src/geometry.ts`.
- Each extension feature is a folder that owns its components, hooks and queries. No barrel files.
- Browser differences belong in `apps/extension/wxt.config.ts`. App code checks whether an API exists, never which browser it's in.

## Components

- One component per file, with its CSS next to it: `FadeBox.tsx` and `fade-box.css`.
- Logic goes in TypeScript and styles go in CSS, inside `@layer components` so a consumer's `className` always wins.
- The root element's class is the component name in kebab case, like `.fade-box`.
- State and variants are `data-*` attributes, inner elements get a `data-part`, and settings are CSS variables.
- Everything interactive works with a keyboard and has an accessible name.
- Controlled props take Base UI's names: `value`, `defaultValue` and `onValueChange`.
- In stories, `meta` holds the shared args and render function, and each story only sets what's different.

## Code style

- Prettier owns formatting.
- Don't nest. Return early, and keep functions to one or two levels of indentation.
- Anything more complex than a simple ternary goes in a named variable.
- Don't swallow props. Spread the ones you don't use onto the root element, and merge `className`, `style` and event handlers instead of replacing them. Don't accept parameters you don't use.
- Generalise code once two or more callers need it, not before.

## Tests

There are two kinds of test, and `pnpm test` runs both:

| What you test                                         | How                                         | Where                                  |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| Pure logic: geometry, gradients, parsers, conversions | Vitest, in Node                             | `*.test.ts` next to the code           |
| How a component looks and behaves                     | A story, with a `play` function to interact | `apps/storybook/stories/*.stories.tsx` |

Every story is a test. It runs in Chromium, Firefox and WebKit, and it fails on an error or an accessibility violation.

### Unit tests

- Test what a function returns for an input, not how it gets there. Call only exported functions.
- Write the test name as a sentence about the behaviour, like `it('keeps the ratio when the width reaches its limit')`.
- Test one behaviour in each test. If the name needs "and", split the test.
- Use values from the real problem, like a 320 × 200 popup, not `foo` and `1`.
- Test the limits: an empty input, zero, the limit, one past the limit, and `Infinity` or `NaN` where a number can be missing.
- Before you fix a bug, write a test that fails because of the bug.
- Don't mock our own modules. If a function is hard to test without a mock, move its pure part into a function of its own.
- Don't use snapshots. They record output, not intent, and people update them without reading them.

### Story tests

- Each story shows one state or one prop that matters, and its name says which, like `FixedAspectRatio`.
- Add a `play` function when the component does something after input: a key, a pointer, a focus change or a new value.
- Find elements as a person does, by role and accessible name: `canvas.getByRole('separator', { name: 'Resize left' })`. Never find them by class or `data-part`.
- Act with `userEvent`, which sends real browser events. Don't call handlers or change state directly.
- Assert what a person can see or use: text, value, focus, ARIA state and size. Don't assert classes or internal state.
- Wait for a change with `await expect(...)` or `waitFor`. Never wait for a fixed time.
- Let size and position assertions be 1px out, because browsers round differently.
- When a test fails in one browser only, fix the component with a feature check. Don't change the test for that browser.
- Don't turn off an accessibility rule to pass a test. Fix the component. If a rule is wrong for one story, turn off that rule in that story only, with a comment that says why.

## Names and comments

Names and comments follow [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/):

- Use simple words, and the same word for the same thing every time.
- Keep names to three words or fewer. Functions start with a verb, like `resolveEdges`.
- Comment only to explain why, never what.
- A comment is one sentence on one line: 20 words or fewer, present tense, active voice, and no `-ing` verbs.
- JSDoc comments (`/** */`) are only for exported types, props and functions.

These words mean one thing everywhere in the code:

- **side:** `top`, `right`, `bottom` or `left`
- **corner:** where two sides meet, like `top-left`
- **edge:** a side or a corner
- **surface:** the popup or the side panel
