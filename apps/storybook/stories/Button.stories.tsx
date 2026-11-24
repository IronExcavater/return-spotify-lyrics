import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { BadgeCheck, Bell, Heart, Play } from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';

const meta = {
    title: 'Button',
    component: Button,
    // The component defaults give every control a value.
    args: {
        children: 'Follow',
        variant: 'secondary',
        size: 'medium',
        tone: 'neutral',
        loading: false,
        disabled: false,
        onClick: fn(),
    },
    argTypes: {
        icon: { control: false },
        badge: { control: false },
        render: { control: false },
    },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Secondary: Story = {
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: 'Follow' });

        await userEvent.tab();
        await expect(button).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');
        await expect(args.onClick).toHaveBeenCalledTimes(2);
    },
};

export const Primary: Story = {
    args: { variant: 'primary', children: 'Log in' },
};

export const PrimaryAccent: Story = {
    args: {
        variant: 'primary',
        tone: 'accent',
        icon: <Play />,
        children: 'Play',
    },
};

export const Tertiary: Story = {
    args: { variant: 'tertiary', children: 'Show all' },
};

export const Negative: Story = {
    args: { tone: 'negative', children: 'Remove from playlist' },
};

// An icon-only button has no label, so it doesn't take the labelled args of meta.
export const IconOnly: StoryObj<typeof Button> = {
    args: {
        variant: 'tertiary',
        icon: <Heart />,
        'aria-label': 'Save to Your Library',
        children: undefined,
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Save to Your Library' })
        ).toBeInTheDocument();
    },
};

/** An icon with no label makes a circle in every variant, like the green play button. */
export const PlayButton: StoryObj<typeof Button> = {
    args: {
        variant: 'primary',
        tone: 'accent',
        size: 'large',
        icon: <Play />,
        'aria-label': 'Play',
        children: undefined,
    },
    play: async ({ canvas }) => {
        const { width, height } = canvas
            .getByRole('button', { name: 'Play' })
            .getBoundingClientRect();
        await expect(Math.abs(width - height)).toBeLessThanOrEqual(1);
    },
};

export const WithBadge: StoryObj<typeof Button> = {
    args: {
        variant: 'tertiary',
        icon: <Bell />,
        'aria-label': 'Notifications, 3 new',
        badge: 3,
        children: undefined,
    },
};

export const Small: Story = {
    args: { size: 'small' },
};

export const Large: Story = {
    args: { size: 'large', variant: 'primary', tone: 'accent' },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: 'Follow' });

        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
        // A disabled button leaves the tab order.
        await userEvent.tab();
        await expect(button).not.toHaveFocus();
    },
};

export const Loading: Story = {
    args: {
        loading: true,
        variant: 'primary',
        tone: 'accent',
        children: 'Save',
    },
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: /Save/ });

        await expect(button).toHaveAttribute('aria-busy', 'true');
        await expect(canvas.getByRole('status')).toHaveAccessibleName(
            'Loading'
        );
        // The label stays in place but hidden, so the button keeps its width.
        await expect(
            within(button).getByText('Save').getBoundingClientRect().width
        ).toBeGreaterThan(0);

        // A loading button ignores clicks, but it stays in the tab order, so focus doesn't jump away.
        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
        await userEvent.tab();
        await expect(button).toHaveFocus();
    },
};

export const AsLink: Story = {
    args: {
        variant: 'primary',
        render: <a href="#playlist" />,
        children: 'Open playlist',
    },
    play: async ({ canvas }) => {
        const link = canvas.getByRole('link', { name: 'Open playlist' });
        await expect(link).toHaveAttribute('href', '#playlist');
    },
};

export const InlineIcon: Story = {
    args: {
        variant: 'tertiary',
        children: (
            <>
                Daft Punk <BadgeCheck data-testid="icon" />
            </>
        ),
    },
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: 'Daft Punk' });
        const icon = within(button).getByTestId('icon');
        // The label is Text, so an icon in it takes the size of the text.
        const fontSize = parseFloat(getComputedStyle(icon).fontSize);
        const height = icon.getBoundingClientRect().height;
        await expect(Math.abs(height - fontSize)).toBeLessThanOrEqual(1);
    },
};
