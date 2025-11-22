import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
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
