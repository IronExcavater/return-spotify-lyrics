import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import Separator from '@return-spotify-lyrics/ui/Separator';

const meta = {
    title: 'Separator',
    component: Separator,
    args: {
        orientation: 'horizontal',
        decorative: false,
    },
    // A line needs something on each side, so the story puts two sections around it.
    render: (args) => (
        <div
            className={
                args.orientation === 'vertical'
                    ? 'flex h-8 items-center gap-3 text-medium'
                    : 'grid w-60 gap-3 text-medium'
            }
        >
            <span>Queue</span>
            <Separator {...args} />
            <span>Recently played</span>
        </div>
    ),
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('separator')).toHaveAttribute(
            'aria-orientation',
            'horizontal'
        );
    },
};

export const Vertical: Story = {
    args: { orientation: 'vertical' },
    play: async ({ canvas }) => {
        const separator = canvas.getByRole('separator');
        await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
        await expect(separator.getBoundingClientRect().height).toBeGreaterThan(
            0
        );
    },
};

/** A line that only decorates is hidden from assistive technology. */
export const Decorative: Story = {
    args: { decorative: true },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('separator')).not.toBeInTheDocument();
    },
};
