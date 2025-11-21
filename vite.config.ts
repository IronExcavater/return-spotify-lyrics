import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: 'popup.html',
                background: 'src/background/background.ts',
            },
            output: {
                entryFileNames: (assetInfo) => {
                    if (assetInfo.name.includes('background'))
                        return 'background.js';
                    return '[name].js';
                },
            },
        },
    },
});
