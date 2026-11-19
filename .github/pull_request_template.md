<!--
Title: `<reason>: <title>` in lower case, like `feat: add portal component`.
The reason is feat, bug, refactor, docs, test, build, ci or chore.
The squash merge uses the title as the commit message on main.
-->

Closes IRO-

## Summary

<!-- One or two sentences: what this changes, and why. -->

## Changes

<!-- What a reviewer needs to know. Say what you decided where the ticket left a choice, and why. -->

-

## Screenshots

<!-- For a change that people can see. Delete this section if there is none. -->

| Before | After |
| ------ | ----- |
|        |       |

## How to review

<!-- Steps that show the change: a story to open, a page in the extension, or a command to run. -->

1.

## Checklist

- [ ] `pnpm check` and `pnpm test` pass.
- [ ] New pure logic has unit tests, and new component behaviour has a story with a `play` function.
- [ ] Everything new works with a keyboard and has an accessible name.
- [ ] I tried the change in: <!-- browsers (Chrome, Edge, Firefox, Opera, Safari) and surfaces (popup, side panel, Storybook) -->
- [ ] The docs match the change: AGENTS.md, CONTRIBUTING.md, README.md or the Tokens page.
- [ ] There is no new dependency, or the summary says why it's needed.

## Notes

<!-- Breaking changes, risks, follow-up tickets, or parts to check closely. Delete this section if there are none. -->
