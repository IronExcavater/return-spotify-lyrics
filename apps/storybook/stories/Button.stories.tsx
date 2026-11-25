import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { BadgeCheck, Bell, Ellipsis, Play } from '@return-spotify-lyrics/icons';
import Button, { type ButtonProps } from '@return-spotify-lyrics/ui/Button';
import Text from '@return-spotify-lyrics/ui/Text';

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

/**
 * The actions of an artist page: a round play button, a pill with a label, and a round icon button. The Follow button
 * takes the args, so the controls change it in place.
 */
export const ArtistActions: Story = {
    render: (args) => (
        <div className="flex items-center gap-4">
            <Button
                variant="primary"
                tone="accent"
                size="large"
                icon={<Play />}
                aria-label="Play The Quiet Hours"
            />
            <Button {...(args as ButtonProps)} />
            <Button
                variant="tertiary"
                icon={<Ellipsis />}
                aria-label="More options for The Quiet Hours"
            />
        </div>
    ),
    play: async ({ canvas, userEvent, args, step }) => {
        const play = canvas.getByRole('button', { name: /^Play/ });
        const follow = canvas.getByRole('button', {
            name: String(args.children),
        });

        await step('An icon with no label makes a circle', async () => {
            const { width, height } = play.getBoundingClientRect();
            await expect(Math.abs(width - height)).toBeLessThanOrEqual(1);
        });

        await step('Enter and Space press the focused button', async () => {
            await userEvent.tab();
            await userEvent.tab();
            await expect(follow).toHaveFocus();
            await userEvent.keyboard('{Enter}');
            await userEvent.keyboard(' ');
            await expect(args.onClick).toHaveBeenCalledTimes(2);
        });
    },
};

// A badge and an icon-only button take the place of the label of meta.
export const WithBadge: StoryObj<typeof Button> = {
    args: {
        variant: 'tertiary',
        icon: <Bell />,
        'aria-label': 'Notifications, 3 new',
        badge: 3,
        children: undefined,
    },
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: /Notifications/ });
        await expect(within(button).getByText('3')).toBeVisible();
    },
};

/** A verified artist's name with its mark: the label is Text, so the icon takes the size of the text. */
export const VerifiedArtist: Story = {
    args: {
        variant: 'tertiary',
        children: (
            <>
                The Quiet Hours <BadgeCheck data-testid="icon" />
            </>
        ),
    },
    play: async ({ canvas }) => {
        const button = canvas.getByRole('button', { name: 'The Quiet Hours' });
        const icon = within(button).getByTestId('icon');
        const fontSize = parseFloat(getComputedStyle(icon).fontSize);
        const height = icon.getBoundingClientRect().height;
        await expect(Math.abs(height - fontSize)).toBeLessThanOrEqual(1);
    },
};

/** A save that takes a moment: the button keeps its width and its place in the tab order, and it ignores clicks. */
export const Loading: Story = {
    args: {
        loading: true,
        variant: 'primary',
        tone: 'accent',
        children: 'Save',
    },
    render: (args) => (
        <div className="grid w-60 gap-3">
            <Text className="text-small text-subdued">
                Saving your lyrics to the draft…
            </Text>
            <Button {...(args as ButtonProps)} />
        </div>
    ),
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: /Save/ });

        await expect(button).toHaveAttribute('aria-busy', 'true');
        await expect(canvas.getByRole('status')).toHaveAccessibleName(
            'Loading'
        );
        await expect(
            within(button).getByText('Save').getBoundingClientRect().width
        ).toBeGreaterThan(0);

        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
        await userEvent.tab();
        await expect(button).toHaveFocus();
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', {
            name: String(args.children),
        });

        await userEvent.click(button);
        await expect(args.onClick).not.toHaveBeenCalled();
        // A disabled button leaves the tab order.
        await userEvent.tab();
        await expect(button).not.toHaveFocus();
    },
};

/** A link with the look of a button stays a link, for a person and for assistive technology. */
export const AsLink: Story = {
    args: {
        variant: 'primary',
        render: <a href="#playlist" />,
        children: 'Open playlist',
    },
    play: async ({ canvas, args }) => {
        const link = canvas.getByRole('link', { name: String(args.children) });
        await expect(link).toHaveAttribute('href', '#playlist');
    },
};
