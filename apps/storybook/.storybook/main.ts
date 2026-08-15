import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    stories: ['../stories/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
    docs: {
        defaultName: 'Docs',
    },
    viteFinal(config) {
        return {
            ...config,
            plugins: [...(config.plugins ?? []), tailwindcss()],
        };
    },
};

export default config;
