import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorPage } from '../../extension/src/errors/ErrorPage';
import { AppError } from '../../extension/src/errors/AppError';

const meta = {
    title: 'App/ErrorPage',
    component: ErrorPage,
    args: {
        error: new AppError('spotify.rate_limited', 'Spotify is receiving too many requests.'),
        title: 'Playback unavailable',
        showBack: true,
        showHome: true,
        showReload: true,
    },
    argTypes: { error: { control: false }, onRetry: { control: false } },
    parameters: { layout: 'fullscreen', docs: { description: { component: 'The shared application-level error surface used by route and React error boundaries.' } } },
} satisfies Meta<typeof ErrorPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
