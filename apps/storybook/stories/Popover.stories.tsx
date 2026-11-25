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
    parameters: {
        // In Safari, Base UI traps focus with hidden spans that pass focus on at once, which this rule reads as a fault.
        a11y: {
            config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] },
        },
    },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A click opens the panel and moves focus into it, and Escape closes it. */
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
            await waitFor(
                () =>
                    expect(
                        within(panel).getByRole('button', { name: 'Copy link' })
                    ).toBeVisible(),
                // A fade can take more than a second in a slow browser.
                { timeout: 3000 }
            );
        });

        // Safari doesn't focus a button on a click, so focus can go back to the trigger only after a keyboard opens it.
        await step('Escape closes it', async () => {
            await userEvent.keyboard('{Escape}');
            // The panel stays in the page while it fades out, so the trigger's state shows that it closed.
            await waitFor(() =>
                expect(trigger).toHaveAttribute('aria-expanded', 'false')
            );
        });
    },
};

/** From the keyboard, Enter opens details at the side of the icon button, and Escape closes them and gives focus back. */
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
    play: async ({ canvas, canvasElement, userEvent, args, step }) => {
        const page = within(canvasElement.ownerDocument.body);
        const trigger = canvas.getByRole('button', {
            name: String(args.title),
        });

        await step('Enter opens the panel at the side', async () => {
            await userEvent.tab();
            await expect(trigger).toHaveFocus();
            await userEvent.keyboard('{Enter}');
            const panel = await page.findByRole('dialog', {
                name: String(args.title),
            });
            await expect(
                panel.getBoundingClientRect().left
            ).toBeGreaterThanOrEqual(trigger.getBoundingClientRect().right);
        });

        await step('Escape closes it and focus goes back', async () => {
            await userEvent.keyboard('{Escape}');
            await waitFor(() =>
                expect(trigger).toHaveAttribute('aria-expanded', 'false')
            );
            await waitFor(() => expect(trigger).toHaveFocus());
        });
    },
};
