// Deletes build output and caches, but keeps the dependencies.
import { globSync, rmSync } from 'node:fs';

const generated = globSync([
    '.turbo',
    '{apps,packages}/*/{.turbo,.output,.wxt,storybook-static}',
    '{apps,packages}/*/node_modules/{.cache,.vite}',
]);

for (const path of generated) rmSync(path, { recursive: true, force: true });
