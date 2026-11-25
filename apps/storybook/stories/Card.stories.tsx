import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Disc3, Play } from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';
import Card from '@return-spotify-lyrics/ui/Card';
import Separator from '@return-spotify-lyrics/ui/Separator';
import Text from '@return-spotify-lyrics/ui/Text';

const meta = {
    title: 'Card',
    component: Card,
    args: {
        className: 'w-44',
        render: <a href="#album" />,
        // The cover and the title respond to the card, and the year and the type stay still.
        children: (
            <>
                <div className="mb-3 overflow-hidden rounded-small">
                    <div className="grid aspect-square place-items-center bg-overlay transition-transform duration-default group-hover/card:scale-105 group-active/card:scale-100">
                        <Disc3 aria-hidden className="size-12 text-subdued" />
                    </div>
                </div>
                <Text
                    render={<p />}
                    className="font-bold group-hover/card:underline"
                    maxLines={1}
                >
                    Paper Satellites
                </Text>
                <div className="flex items-center text-small text-subdued">
                    <Text>2026</Text>
                    <Separator
                        orientation="vertical"
                        variant="dot"
                        decorative
                    />
                    <Text>Album</Text>
                </div>
            </>
        ),
    },
    argTypes: {
        children: { control: false },
        render: { control: false },
    },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * An album card is one link, with the focus ring around the whole card and the pointer over it. A hover lights up the
 * card, zooms the cover and underlines the title. A press only settles the cover back.
 */
export const Album: Story = {
    play: async ({ canvas, userEvent }) => {
        const link = canvas.getByRole('link', { name: /Paper Satellites/ });
        await userEvent.tab();
        await expect(link).toHaveFocus();
        await expect(getComputedStyle(link).outlineStyle).toBe('solid');
        await expect(getComputedStyle(link).cursor).toBe('pointer');
    },
};

/** A card that only holds content stays a plain surface, so it can hold its own controls, like a play button. */
export const WithControls: Story = {
    args: {
        render: undefined,
        children: (
            <>
                <Text render={<p />} className="font-bold">
                    Up next
                </Text>
                <Text render={<p />} className="mb-3 text-small text-subdued">
                    Glass Harbour, by Lumen Fields
                </Text>
                <Button
                    variant="primary"
                    tone="accent"
                    icon={<Play />}
                    aria-label="Play Glass Harbour"
                />
            </>
        ),
    },
    play: async ({ canvas, userEvent }) => {
        const play = canvas.getByRole('button', { name: 'Play Glass Harbour' });
        await expect(getComputedStyle(canvas.getByText('Up next')).cursor).toBe(
            'auto'
        );
        await userEvent.tab();
        await expect(play).toHaveFocus();
    },
};

export const AsButton: Story = {
    args: { render: <button type="button" />, onClick: fn() },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: /Paper Satellites/ })
        );
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};
