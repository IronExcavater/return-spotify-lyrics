import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import Link, { type LinkProps } from '@return-spotify-lyrics/ui/Link';
import LinkProvider from '@return-spotify-lyrics/ui/LinkProvider';
import Text from '@return-spotify-lyrics/ui/Text';

const ALBUM = '/album/4aawyAB9vmqN3uQ7FjRGTy';

function toHashHref(to: string) {
    return `#${to}`;
}

// A stand-in for the app's router, which shows the route that a link went to.
function RouterDemo(props: LinkProps) {
    const [route, setRoute] = useState('/home');

    return (
        <LinkProvider navigate={setRoute} resolveHref={toHashHref}>
            <div className="grid gap-2 text-medium text-subdued">
                <Link {...props} />
                <p role="status">Route: {route}</p>
            </div>
        </LinkProvider>
    );
}

const meta = {
    title: 'Link',
    component: Link,
    // The component defaults give every control a value.
    args: {
        href: ALBUM,
        children: 'Paper Satellites',
        underline: 'hover',
        externalLabel: 'opens in a new tab',
    },
    argTypes: { children: { control: 'text' } },
    render: (args) => <RouterDemo {...args} />,
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Internal: Story = {
    play: async ({ canvas, userEvent }) => {
        const link = canvas.getByRole('link', { name: 'Paper Satellites' });
        // A new tab opens the route through the hash router.
        await expect(link).toHaveAttribute('href', `#${ALBUM}`);

        await userEvent.click(link);
        await waitFor(() =>
            expect(canvas.getByRole('status')).toHaveTextContent(ALBUM)
        );
    },
};

export const External: Story = {
    args: {
        href: 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy',
        children: 'Open in Spotify',
    },
    play: async ({ canvas }) => {
        const link = canvas.getByRole('link', {
            name: 'Open in Spotify (opens in a new tab)',
        });
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noreferrer');
    },
};

export const InText: Story = {
    render: () => (
        <Text className="w-72 text-subdued">
            Lyrics come from{' '}
            <Link href="https://lrclib.net" underline="always">
                LRCLIB
            </Link>
            , a free and open lyrics database.
        </Text>
    ),
};

export const WithoutProvider: Story = {
    render: (args) => <Link {...args} />,
    play: async ({ canvas }) => {
        // With no router, a route stays a plain anchor for the browser to follow.
        await expect(
            canvas.getByRole('link', { name: 'Paper Satellites' })
        ).toHaveAttribute('href', ALBUM);
    },
};
