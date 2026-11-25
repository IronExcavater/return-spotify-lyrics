import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import {
    Heart,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
} from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';
import Tooltip from '@return-spotify-lyrics/ui/Tooltip';
import TooltipProvider from '@return-spotify-lyrics/ui/TooltipProvider';

const meta = {
    title: 'Tooltip',
    component: Tooltip,
    args: {
        label: 'Save to Your Library',
        side: 'top',
        align: 'center',
        gap: 8,
        showArrow: false,
        delay: 500,
        closeDelay: 0,
        // The tooltip only shows, so the button's name says the same thing.
        children: (
            <Button
                variant="tertiary"
                icon={<Heart />}
                aria-label="Save to Your Library"
            />
        ),
    },
    argTypes: {
        label: { control: 'text' },
        children: { control: false },
    },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Focus shows the tooltip at once, so keyboard users get the hint too, and Escape hides it. */
export const IconButton: Story = {
    play: async ({ canvasElement, userEvent, args }) => {
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.tab();
        // The tooltip fades in, so the test waits until it is fully shown.
        await waitFor(() =>
            expect(page.getByText(String(args.label))).toBeVisible()
        );
        await userEvent.keyboard('{Escape}');
        await waitFor(() =>
            expect(page.queryByText(String(args.label))).not.toBeInTheDocument()
        );
    },
};

/**
 * Each player button shows its name through Button's `tooltip` prop. The provider groups them, so after one opens, the
 * next one along the row opens at once.
 */
export const PlayerControls: Story = {
    // The scene builds its own buttons, so the controls of meta don't reach it.
    parameters: { controls: { disable: true } },
    render: () => (
        <TooltipProvider>
            <div
                role="group"
                aria-label="Player"
                className="flex items-center gap-1"
            >
                <Button
                    variant="tertiary"
                    icon={<Shuffle />}
                    aria-label="Shuffle"
                    tooltip
                />
                <Button
                    variant="tertiary"
                    icon={<SkipBack />}
                    aria-label="Previous"
                    tooltip
                />
                <Button
                    variant="tertiary"
                    icon={<SkipForward />}
                    aria-label="Next"
                    tooltip
                />
                <Button
                    variant="tertiary"
                    icon={<Repeat />}
                    aria-label="Repeat"
                    tooltip
                />
            </div>
        </TooltipProvider>
    ),
    play: async ({ canvasElement, userEvent }) => {
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.tab();
        await waitFor(() => expect(page.getByText('Shuffle')).toBeVisible());
        await userEvent.tab();
        await waitFor(() => expect(page.getByText('Previous')).toBeVisible());
        await waitFor(() =>
            expect(page.queryByText('Shuffle')).not.toBeInTheDocument()
        );
    },
};
