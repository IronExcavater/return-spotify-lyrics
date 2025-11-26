import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                background: 'src/background/background.ts',
                popup: 'popup.html',
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
            },
        },
    },
});
