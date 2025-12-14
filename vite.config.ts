import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config.ts';
import zip from 'vite-plugin-zip-pack';
import { name, version } from './package.json';
import path from 'node:path';

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
