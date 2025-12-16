import path from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config.ts';
import { name, version } from './package.json';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        crx({ manifest }),
        zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
    ],
    resolve: {
        alias: {
            '@': `${path.resolve(__dirname, 'src')}`,
        },
    },
    server: {
        cors: {
            origin: [/chrome-extension:\/\//],
        },
    },
});
