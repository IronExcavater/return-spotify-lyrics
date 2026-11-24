import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { MicVocal } from '@return-spotify-lyrics/icons';
import Link, { type LinkProps } from '@return-spotify-lyrics/ui/Link';
import Text from '@return-spotify-lyrics/ui/Text';
import TextProvider from '@return-spotify-lyrics/ui/TextProvider';

const ALBUM = '/album/4aawyAB9vmqN3uQ7FjRGTy';

function toHashHref(to: string) {
    return `#${to}`;
}

// A stand-in for the app's router, which shows the route that a link went to.
function RouterDemo(props: LinkProps) {
    const [route, setRoute] = useState('/home');

    return (
        <TextProvider navigate={setRoute} resolveHref={toHashHref}>
            <div className="grid gap-2 text-medium text-subdued">
                <Link {...props} />
                <p role="status">Route: {route}</p>
            </div>
        </TextProvider>
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
    argTypes: { children: { control: 'text' }, icon: { control: false } },
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

export const NewTabTarget: Story = {
    args: { target: '_blank' },
    play: async ({ canvas, userEvent }) => {
        // The test stops the new tab after the link handles the click, so no window opens.
        window.addEventListener('click', (event) => event.preventDefault(), {
            once: true,
        });
        await userEvent.click(
            canvas.getByRole('link', { name: 'Paper Satellites' })
        );
        await expect(canvas.getByRole('status')).toHaveTextContent('/home');
    },
};

export const Download: Story = {
    args: { download: true },
    play: async ({ canvas, userEvent }) => {
        // The test stops the download after the link handles the click, so no file saves.
        window.addEventListener('click', (event) => event.preventDefault(), {
            once: true,
        });
        await userEvent.click(
            canvas.getByRole('link', { name: 'Paper Satellites' })
        );
        await expect(canvas.getByRole('status')).toHaveTextContent('/home');
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

export const WithIcon: Story = {
    args: {
        href: '/artist/4tZwfgrHOc3mvqYlEYSvVi',
        children: 'Daft Punk',
        icon: <MicVocal data-testid="icon" />,
    },
    play: async ({ canvas }) => {
        // The icon only decorates, so the link's name is its text alone.
        const link = canvas.getByRole('link', { name: 'Daft Punk' });
        await expect(within(link).getByTestId('icon')).toBeVisible();
    },
};

export const InText: Story = {
    render: () => (
        <Text render={<p />} className="w-72 text-subdued">
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
