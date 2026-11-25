import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import Badge from '@return-spotify-lyrics/ui/Badge';

const meta = {
    title: 'Badge',
    component: Badge,
    args: {
        count: 3,
        max: 99,
        tone: 'accent',
        size: 'medium',
    },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Count: Story = {
    play: async ({ canvas, args }) => {
        await expect(canvas.getByText(String(args.count))).toBeVisible();
    },
};

/** A count past the maximum shows the maximum and a plus, so the badge keeps its size. */
export const CappedCount: Story = {
    args: { count: 120 },
    play: async ({ canvas, args }) => {
        await expect(canvas.getByText(`${args.max}+`)).toBeVisible();
    },
};

export const Small: Story = {
    args: { size: 'small' },
};

export const Negative: Story = {
    args: { tone: 'negative' },
};

// A label or a dot takes the place of the count of meta.
export const Label: StoryObj<typeof Badge> = {
    args: { count: undefined, children: 'New' },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('New')).toBeVisible();
    },
};

/** A dot has no text, so it takes its name from `aria-label`. */
export const Dot: StoryObj<typeof Badge> = {
    args: { count: undefined, dot: true, 'aria-label': 'New episodes' },
    play: async ({ canvas }) => {
        const dot = canvas.getByRole('img', { name: 'New episodes' });
        const { width, height } = dot.getBoundingClientRect();
        await expect(width).toBe(height);
    },
};
