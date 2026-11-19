import {
    DocsContainer,
    type DocsContainerProps,
} from '@storybook/addon-docs/blocks';
import type { Preview } from '@storybook/react-vite';
import { useDarkMode } from 'storybook-dark-mode';
import { themes } from 'storybook/theming';

import '@return-spotify-lyrics/ui/font';
import './preview.css';

// The toolbar switch sets the Storybook UI, so the docs pages follow it here.
function ThemedDocsContainer(props: DocsContainerProps) {
    const theme = useDarkMode() ? themes.dark : themes.light;
    return <DocsContainer {...props} theme={theme} />;
}

const preview: Preview = {
    parameters: {
        docs: { container: ThemedDocsContainer },
        // An accessibility violation fails the story test, in the Storybook UI and in CI.
        a11y: { test: 'error' },
        layout: 'centered',
    },
};

export default preview;
