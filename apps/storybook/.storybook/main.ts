import tailwindcss from '@tailwindcss/vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    framework: '@storybook/react-vite',
    // Storybook reads docs pages from plain .mdx files, not from .stories.mdx files.
    stories: ['../stories/**/*.@(mdx|stories.@(ts|tsx))'],
    addons: [
        '@storybook/addon-docs',
        '@storybook/addon-a11y',
        '@storybook/addon-vitest',
        'storybook-dark-mode',
    ],
    // Storybook reads no prop types, so each control comes from the story's args.
    typescript: { reactDocgen: false },
    viteFinal: (config) => {
        config.plugins?.push(tailwindcss());
        return config;
    },
};

export default config;
