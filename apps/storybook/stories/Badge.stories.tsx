import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Bell } from '@return-spotify-lyrics/icons';
import Badge from '@return-spotify-lyrics/ui/Badge';
import Button from '@return-spotify-lyrics/ui/Button';
import Text from '@return-spotify-lyrics/ui/Text';

const meta = {
    title: 'Badge',
    component: Badge,
    args: {
        count: 3,
        max: 99,
        tone: 'accent',
        size: 'medium',
    },
    // A badge marks something, so each story puts it next to the thing it marks.
    render: (args) => (
        <div className="flex items-center gap-2">
            <Text className="font-bold">New episodes</Text>
            <Badge {...args} />
        </div>
    ),
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A count past the maximum shows the maximum and a plus, so the badge keeps its size. */
export const Count: Story = {
    args: { count: 120 },
    play: async ({ canvas, args }) => {
        await expect(canvas.getByText(`${args.max}+`)).toBeVisible();
    },
};

/** On a button, the badge sits on the top-right corner, and the button's name says the count too. */
export const OnButton: Story = {
    args: { size: 'small' },
    render: (args) => (
        <Button
            variant="tertiary"
            icon={<Bell />}
            aria-label={`Notifications, ${args.count} new`}
            badge={<Badge {...args} />}
        />
    ),
    play: async ({ canvas, args }) => {
        const button = canvas.getByRole('button', { name: /Notifications/ });
        const badge = within(button).getByText(String(args.count));
        // The badge overlaps the corner, so its top is above the button.
        await expect(badge.getBoundingClientRect().top).toBeLessThan(
            button.getBoundingClientRect().top
        );
    },
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
    args: { count: undefined, dot: true, 'aria-label': 'Unplayed' },
    play: async ({ canvas }) => {
        const dot = canvas.getByRole('img', { name: 'Unplayed' });
        const { width, height } = dot.getBoundingClientRect();
        await expect(width).toBe(height);
    },
};
