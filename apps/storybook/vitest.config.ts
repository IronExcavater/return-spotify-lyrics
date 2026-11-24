import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [storybookTest()],
    test: {
        name: 'storybook',
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            // WebKit is the Safari engine, so these three cover every browser the extension supports.
            instances: [
                { browser: 'chromium' },
                { browser: 'firefox' },
                { browser: 'webkit' },
            ],
        },
        coverage: {
            // V8 coverage works in Chromium only, so it fails with three browsers.
            provider: 'istanbul',
            // The components are outside this app, so coverage must look outside its root.
            allowExternal: true,
            include: ['../../packages/ui/src/**/*.{ts,tsx}'],
            exclude: ['**/*.test.ts'],
            // CI puts the text file in the job summary.
            reporter: [
                'text',
                'html',
                ['text', { file: 'coverage.txt', maxCols: 0 }],
            ],
        },
    },
});
