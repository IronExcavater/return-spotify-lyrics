import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Code, Info, Link2 } from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';
import Popover from '@return-spotify-lyrics/ui/Popover';
import Text from '@return-spotify-lyrics/ui/Text';

const meta = {
    title: 'Popover',
    component: Popover,
    args: {
        title: 'Share Paper Satellites',
        trigger: <Button>Share</Button>,
        side: 'bottom',
        align: 'center',
        gap: 8,
        showArrow: false,
        defaultOpen: false,
        children: (
            <div className="grid gap-2">
                <Text render={<p />} className="text-small text-subdued">
                    Send the track to a friend, or put it on a page.
                </Text>
                <Button
                    variant="primary"
                    tone="accent"
                    size="small"
                    icon={<Link2 />}
                >
                    Copy link
                </Button>
                <Button size="small" icon={<Code />}>
                    Embed track
                </Button>
            </div>
        ),
    },
    argTypes: {
        title: { control: 'text' },
        trigger: { control: false },
        children: { control: false },
    },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A click opens the panel and moves focus into it. Escape closes it, and focus goes back to the trigger. */
export const ShareTrack: Story = {
    play: async ({ canvas, canvasElement, userEvent, args, step }) => {
        const page = within(canvasElement.ownerDocument.body);
        const trigger = canvas.getByRole('button', { name: 'Share' });

        await step('A click opens the panel, named by its title', async () => {
            await userEvent.click(trigger);
            const panel = await page.findByRole('dialog', {
                name: String(args.title),
            });
            // The panel fades in, so the test waits until it is fully shown.
            await waitFor(() =>
                expect(
                    within(panel).getByRole('button', { name: 'Copy link' })
                ).toBeVisible()
            );
        });

        await step('Escape closes it and focus goes back', async () => {
            await userEvent.keyboard('{Escape}');
            await waitFor(() =>
                expect(page.queryByRole('dialog')).not.toBeInTheDocument()
            );
            await expect(trigger).toHaveFocus();
        });
    },
};

/** An icon button opens details at its side, with an arrow that points back at it. Enter opens it from the keyboard. */
export const TrackDetails: Story = {
    args: {
        title: 'About this track',
        trigger: (
            <Button
                variant="tertiary"
                icon={<Info />}
                aria-label="About this track"
            />
        ),
        side: 'right',
        showArrow: true,
        children: (
            <div className="grid gap-1 text-small">
                <Text>Written by Mara Hollis and Ada Vale</Text>
                <Text className="text-subdued">Released 14 March 2026</Text>
                <Text className="text-subdued">Lyrics from LRCLIB</Text>
            </div>
        ),
    },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.tab();
        await expect(
            canvas.getByRole('button', { name: String(args.title) })
        ).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        const panel = await page.findByRole('dialog', {
            name: String(args.title),
        });
        const trigger = canvas.getByRole('button', {
            name: String(args.title),
        });
        // The panel sits to the right of the trigger.
        await expect(panel.getBoundingClientRect().left).toBeGreaterThanOrEqual(
            trigger.getBoundingClientRect().right
        );
    },
};
