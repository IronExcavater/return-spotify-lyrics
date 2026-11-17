import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    stories: ['../stories/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-docs'],
    viteFinal: (config) => {
        config.plugins?.push(tailwindcss());
        return config;
    },
};

export default config;
