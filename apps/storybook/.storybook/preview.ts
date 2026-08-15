import type { Preview } from '@storybook/react-vite';

import './preview.css';

const preview: Preview = {
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        backgrounds: {
            default: 'app',
            values: [
                { name: 'app', value: '#121212' },
                { name: 'surface', value: '#181818' },
                { name: 'raised', value: '#202020' },
            ],
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            toc: true,
        },
    },
};

export default preview;
