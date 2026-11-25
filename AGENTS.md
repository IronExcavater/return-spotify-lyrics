# AGENTS.md

Return Spotify Lyrics is a browser extension for Spotify playback and synced lyrics, built on its own UI library. This is the coding guide for the people and the coding agents who work on it. Setup, commands and the pull request steps are in [CONTRIBUTING.md](CONTRIBUTING.md).

Each rule is a default, with its reason. If a rule makes the code worse in one place, break it there and add a comment that says why.

## Before a change is done

- `pnpm check` and `pnpm test` pass.
- New pure logic has unit tests, and new component behaviour has a story with a `play` function. See [Tests](#tests).
- You tried the change in a browser: its story in Storybook, or the extension in dev mode.
- The change does one thing. Put an unrelated fix in a pull request of its own, so that each one is easy to review and to revert.
- Agents: don't commit, push or open a pull request unless someone asks you to.
- Agents: switch branches in a git worktree, not in the main folder, so that a person's dev server keeps its files.

## Layout

| Path             | What it holds                                                    |
| ---------------- | ---------------------------------------------------------------- |
| `apps/extension` | The WXT extension. The popup and side panel share one React app. |
| `apps/storybook` | A story file for every component in `packages/ui`.               |
| `packages/ui`    | The component library. Base UI is its only primitive library.    |
| `packages/icons` | Icons as React components.                                       |

In `apps/extension/src`:

| Folder               | What it holds                                                                      |
| -------------------- | ---------------------------------------------------------------------------------- |
| `app`                | The shell: providers, the router, the surface, the popup size and the error pages. |
| `features/<feature>` | One feature, like `lyrics` or `queue`, with its pages, components and hooks.       |
| `integrations/<api>` | The only code that talks to an outside service, like Spotify or LRCLIB.            |
| `storage`            | Storage items and the hooks that read them.                                        |
| `shared`             | Code that two or more features use and that isn't general enough for the library.  |
| `entrypoints`        | The files that WXT builds: background, popup and side panel.                       |

In `packages/ui/src`:

| Folder              | What it holds                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `components/<Name>` | One component, with its CSS and the hooks and helpers that only it uses.      |
| `hooks`             | Hooks that are not about one component, like `useReducedMotion`.              |
| `helpers`           | Pure functions and types that two or more components use, like `geometry.ts`. |
| `theme`             | `theme.css`, which imports every component's CSS, and the font.               |

## Architecture

- Import another package by name, like `@return-spotify-lyrics/ui/FadeBox`, never by a relative path. A package never imports from an app. This keeps each package usable on its own.
- Put shared code in the lowest package that every user of it can import. That's why `Size` lives in `packages/ui/src/helpers/geometry.ts`.
- `packages/ui` knows nothing about Spotify, storage or the extension. It must work in Storybook and on any surface.
- A feature owns its folder. When a second feature needs some of its code, move that code to `shared`, or to `packages/ui` if it's general.
- Only `integrations` calls outside services. Components and hooks use its functions, so an API change touches one folder.
- Don't add barrel files (an `index.ts` that only re-exports). They hide where code lives and can pull unused code into a bundle. `packages/ui` lists each module in its `exports` instead.
- Put browser differences in `apps/extension/wxt.config.ts`. App code checks whether an API exists, never which browser it runs in.
- In the extension, import from another top folder with `@/`, like `@/storage/popup`, and from the same folder with a relative path.

## TypeScript

- Keep the strict settings on. Don't silence an error with `any`, `@ts-ignore` or a non-null `!`. Fix the type. If you can't, use `@ts-expect-error` with a comment that says why. Tests can use `!` after a check that would fail first.
- Use `type`, not `interface`. Use `interface` only to add to another module's types, like `css.ts` does for CSS variables.
- `exactOptionalPropertyTypes` is on. If an optional property can take `undefined`, write `prop?: T | undefined`.
- `noUncheckedIndexedAccess` is on, so an index can give `undefined`. Handle it with `??` or an early return, not a cast.
- Keep one list as the source of truth, and get its type from it with `as const` and `typeof`, like `EDGES` in `geometry.ts`.
- Write `import type` for imports that are only types.
- Exported functions, other than components, declare their return type. Then a change inside a function can't change its public type by accident.
- Data from the network or another extension context is `unknown` until you check its shape. Don't cast it to the type you expect.

## React

### Files and exports

- One component per file. The file's default export has the file's name: `FadeBox.tsx` exports `FadeBox`.
- A hook has a file of its own, with the same rule: `useResize.ts` exports `useResize`. A provider file can also export the hook that reads it, like `useSurface` in `SurfaceProvider.tsx`.
- A file of helpers, like `geometry.ts`, uses named exports.
- Write components as `function` declarations. Use arrow functions for callbacks.
- The props type is `<Component>Props`, like `FadeBoxProps`. Export it from `packages/ui`.
- Move logic that doesn't need React into a pure function in a `.ts` file, and test it there. `geometry.ts` holds the ResizeBox maths for that reason.

### State

- Keep as little state as you can, and calculate the rest during render. Don't copy a prop into state, and don't store a value that you can calculate.
- Keep state in the lowest component that needs it. Move it up only when another component needs it too.
- A value that a person changes takes Base UI's prop names: `value`, `defaultValue` and `onValueChange`. Then every control in the app works the same way.
- Keep extension settings in a storage item in `apps/extension/src/storage`, and read them with `useStorageState`.

### Effects

- Use an effect only to sync with something outside React: the DOM, a browser API, storage or a subscription.
- Respond to a person's action in the event handler, not in an effect that watches state.
- An effect that subscribes, observes, listens or starts a timer returns a cleanup that stops it.
- Ignore an async result that arrives after cleanup, with a `cancelled` flag, as `useStorageState` does.
- List every value that the effect reads in its dependencies. To read the latest value without a rerun, keep it in a ref.
- Use `useLayoutEffect` only to read or change layout before the browser paints, like a measurement or a DOM move. Use `useEffect` for the rest.
- Read the DOM in effects and event handlers, never during render.

### Memoisation

- Don't add `useMemo`, `useCallback` or `memo` by default. Add one when a profile shows a cost, or when a value needs a stable identity, like a dependency or a context value.

## Components in packages/ui

- **One folder per component.** A component's folder is in `src/components`, has its name and holds its files: `FadeBox/FadeBox.tsx` and `FadeBox/fade-box.css`. A hook that belongs to a component goes in the same folder, like `Portal/usePortalSlot.tsx`, with its own entry in the package `exports`. Code that two or more components use goes in `src/helpers` or `src/hooks`.
- **One tag first.** A component works as a single element. Named content goes in slot props, like `icon`, `label` or `trigger`, and the main content is `children`. Export parts, like `Menu.Item`, only when one tag can't make a layout.
- **The root element** has the component name in kebab case as its class, like `.fade-box`.
- **Don't swallow props.** Spread the props you don't use onto the root element. Merge `className` with `clsx`, call the consumer's event handlers as well as your own, and let the consumer's `style` win, except for values the component must control, like the ResizeBox size.
- **Keep native behaviour.** When a component takes over a native action, like a link click, the native props that change that action still work. Link gives a click with `target` or `download` back to the browser.
- **State and variants** are `data-*` attributes, like `data-dragging` or `data-placement`. Inner elements get a `data-part`, like `data-part="handle"`. Settings that CSS uses are CSS variables, like `--fade-size`. Then a consumer can restyle any of them from outside.
- **Every prop has a default** in the parameter list, so that the docs and the story controls show it.
- **Text goes through Text.** A component shows its text with `Text`, and a control's name with `<Text inline>`. Text has no typography of its own, so the component sets it in its CSS with the theme's utilities, like `@apply text-small font-bold`. Then formatting, inline icons and nouns work the same everywhere.
- **Lengths** take a number for pixels or a string for any CSS length. Use the `CssLength` type and `toCssSize`.
- **Names describe meaning, not looks:** `tone="negative"`, not `color="red"`.
- **Write a JSDoc line** for the component, and for each exported prop whose name doesn't say everything. The Controls panel in Storybook and the editor's hover show them.
- **Base UI first.** Build on Base UI for anything with keyboard and focus rules: menus, dialogs, lists, sliders and popups. Build your own only for layout, visuals and motion, where Base UI has nothing.

## Styling

- A component's own styles go in the CSS file in its folder, like `FadeBox/fade-box.css`, inside `@layer components`, and `theme.css` imports the file. The layer lets a consumer's Tailwind class win without `!important`.
- Use Tailwind classes in JSX for layout and one-off styles.
- Write hover and press styles with Tailwind's `hover:` and `active:`, or in CSS with `:is(:hover, [data-hover])` and `:is(:active, [data-active])`. The `useCopies` hook marks the copies of repeated content, like a Marquee loop, with those attributes, so the copies share the styles.
- Use only the theme tokens, like `bg-raised`, `text-subdued` and `rounded-medium`. The theme removes Tailwind's colours, text sizes, radii and shadows, so a class like `text-red-500` makes no CSS. The Tokens page in Storybook lists every token and what it's for.
- Use `style` only for values that change at run time, and pass them as CSS variables. Never use `!important`.
- Both surfaces are narrow, so change a layout with container queries, like `@xs:` on a parent with `@container`, not with viewport breakpoints.
- Give transitions a `duration-*` token. The theme sets each one to `0s` when someone asks for reduced motion. A component with its own animation checks `prefers-reduced-motion` itself.

## Accessibility

- Tab reaches every interactive element. Enter or Space activates it, the arrow keys move inside a group of controls, and Escape closes what is open.
- Every interactive element has an accessible name: a visible label, or `aria-label` when it shows only an icon. Icons that only decorate get `aria-hidden`.
- Use a native element first, like `button`, `input` or `a`, then Base UI, and ARIA roles last. A custom widget follows its [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern, like the window splitter that ResizeBox uses.
- Keep focus visible with the focus ring, and never lose it. When an element moves, closes or drops, focus goes to a sensible element.
- Don't show meaning with colour alone, and keep text at WCAG AA contrast. The story tests check contrast too.
- Story tests check every story with axe, and a violation fails CI.

## Browser support

- The extension supports Chrome, Edge, Opera, Firefox and Safari 26. Check each web API on [MDN](https://developer.mozilla.org/) or [Can I use](https://caniuse.com/) before you use it.
- When a browser doesn't have an API, check for it and add a fallback, like `moveBefore` in `usePortalSlot`.
- Story tests run in Chromium, Firefox and WebKit, which is the Safari engine. Run them in all three before you push, because a fix for one browser can break another.
- Read what a consumer set from the prop or the attribute, not from a DOM property that the browser fills in. For an anchor with no `target`, Firefox gives the page's base target.

## Performance

- Animate `transform` and `opacity` where you can, because they don't make the browser recalculate layout.
- Watch sizes with `ResizeObserver` and visibility with `IntersectionObserver`, not with timers or window events.
- Load large features, like the rich text editor, only when someone opens them.

## Errors

- Don't swallow an error. Catch it only where you can recover or report it.
- For a promise that nothing waits for, write `void promise.catch(console.error)`.
- A hook that needs a provider throws an error that names both when the provider is missing, like `useSurface`.
- A route that fails shows `RouteErrorPage`, and `AppErrorBoundary` catches the rest.

## Dependencies

- Use the platform first, then a package that the workspace already has, and add a new package last. A new package must save real work and be maintained.
- Add a package to the workspace package that uses it, not to the root, unless it's a tool for the whole repository.
- Base UI is the only primitive library in `packages/ui`.

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

- In a story file, `meta` holds the shared args and the render function, and each story sets only what's different.
- A story file has no constants at the top. A story keeps its values in its args, and its `play` function reads them from `args`, so a value is written once. Fixtures that many files use go in `shared.tsx`.
- Storybook has no docs page for each component, because the stories show the component and the Controls panel shows its props.
- Controls come from the prop types. Set a control in `argTypes` only when a type can't give it, like `CssLength` or `Direction`.
- Each story shows one state or one prop that matters, and its name says which, like `FixedAspectRatio`.
- Add a `play` function when the component does something after input: a key, a pointer, a focus change or a new value.
- Find elements as a person does, by role and accessible name: `canvas.getByRole('separator', { name: 'Resize left' })`. Never find them by class or `data-part`.
- Act with `userEvent`, which sends real browser events. Don't call handlers or change state directly.
- Assert what a person can see or use: text, value, focus, ARIA state and size. Don't assert classes or internal state.
- Wait for a change with `await waitFor(() => expect(...))`, because `expect` checks once and doesn't wait. Never wait for a fixed time.
- Keep a story's state in React, with `useState`. Storybook's `useArgs` can't change args in a story test, and it fails when React state changes.
- Let size and position assertions be 1px out, because browsers round differently.
- Find an element with no role, like the root of a FadeBox, by a `data-testid` that the story sets.
- A click that leaves the page, like a new tab or a download, stops the test run. Before the click, add a `click` listener on `window` that calls `preventDefault`, as the Link stories do.
- A lazy chunk can take more than a second to load on a cold server. Give a `findBy` that waits for one a longer `timeout`, as the Text stories do.
- `userEvent` pointers aren't real pointers, so Firefox refuses `setPointerCapture` for them. Before a drag, replace that element's `setPointerCapture` with a function that does nothing.
- When a test fails in one browser only, fix the component with a feature check. Don't change the test for that browser.
- Don't turn off an accessibility rule to pass a test. Fix the component. If a rule is wrong for one story, turn off that rule in that story only, with a comment that says why.

## Code style

- Prettier owns formatting, and its Tailwind plugin sorts classes. Don't format by hand.
- Don't nest. Return early, and keep functions to one or two levels of indentation.
- Put anything more complex than a simple ternary in a named variable.
- Don't accept parameters you don't use.
- Generalise code once two or more callers need it, not before.
- Put constants at the top of the module in `SCREAMING_SNAKE_CASE`, like `MAX_POPUP_SIZE`.
- Group imports: outside packages first, then workspace packages, then local files, with a blank line between the groups.
- When you move or rename a file, search the whole repository for its old path. Typecheck doesn't see paths in config files and CSS, like `tailwindStylesheet` in `prettier.config.mjs` or `@source` in `theme.css`.
- Delete code you don't use. Don't comment it out, because git keeps the history. Knip reports unused files, exports and dependencies.

## Names and comments

Names and comments follow [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/):

- Use simple words, and the same word for the same thing every time.
- Keep names to three words or fewer. Functions start with a verb, like `resolveEdges`.
- Name an event handler for what it does, like `endDrag`, not for the event, like `handlePointerUp`.
- Name a boolean so that it reads as yes or no, like `enabled`, `showGrip` or `isCorner`.
- Name files after their default export: `FadeBox.tsx`, `useResize.ts`. CSS files use kebab case, like `fade-box.css`.
- Comment only to explain why, never what.
- A comment is one sentence on one line: 20 words or fewer, present tense, active voice, and no `-ing` verbs.
- JSDoc comments (`/** */`) are only for exported types, props and functions.

These words mean one thing everywhere in the code:

- **side:** `top`, `right`, `bottom` or `left`
- **corner:** where two sides meet, like `top-left`
- **edge:** a side or a corner
- **surface:** the popup or the side panel
