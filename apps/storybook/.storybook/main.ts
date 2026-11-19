import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    // Storybook reads docs pages from plain .mdx files, not from .stories.mdx files.
    stories: ['../stories/**/*.@(mdx|stories.@(ts|tsx))'],
    addons: ['@storybook/addon-docs'],
    viteFinal: (config) => {
        config.plugins?.push(tailwindcss());
        return config;
    },
};

export default config;
