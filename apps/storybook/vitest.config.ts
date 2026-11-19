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
    },
});
