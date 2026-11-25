import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import Card from '@return-spotify-lyrics/ui/Card';
import Text from '@return-spotify-lyrics/ui/Text';

const meta = {
    title: 'Card',
    component: Card,
    args: {
        className: 'w-44',
        children: (
            <>
                <div className="mb-3 aspect-square rounded-small bg-overlay" />
                <Text render={<p />} className="font-bold">
                    Paper Satellites
                </Text>
                <Text render={<p />} className="text-small text-subdued">
                    The Quiet Hours
                </Text>
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

export const Plain: Story = {
    play: async ({ canvas }) => {
        const title = canvas.getByText('Paper Satellites');
        await expect(getComputedStyle(title).cursor).toBe('auto');
    },
};

/** A card that is a link takes the whole card as one target, with a focus ring around it. */
export const AsLink: Story = {
    args: { render: <a href="#album" /> },
    play: async ({ canvas, userEvent }) => {
        const link = canvas.getByRole('link', { name: /Paper Satellites/ });
        await userEvent.tab();
        await expect(link).toHaveFocus();
        await expect(getComputedStyle(link).outlineStyle).toBe('solid');
        // A card that does something shows the pointer, and a plain card keeps the arrow.
        await expect(getComputedStyle(link).cursor).toBe('pointer');
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
