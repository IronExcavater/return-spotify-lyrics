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
    // The default docgen can't read imported types or unions with undefined, so controls for them break.
    typescript: {
        reactDocgen: 'react-docgen-typescript',
        reactDocgenTypescriptOptions: {
            // The components are in the ui package, which this app's tsconfig doesn't include.
            tsconfigPath: '../../packages/ui/tsconfig.json',
            include: ['../../packages/ui/src/**/*.tsx'],
            shouldExtractLiteralValuesFromEnum: true,
            shouldRemoveUndefinedFromOptional: true,
        },
    },
    viteFinal: (config) => {
        config.plugins?.push(tailwindcss());
        return config;
    },
};

export default config;
