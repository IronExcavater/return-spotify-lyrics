import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import Switch from '@return-spotify-lyrics/ui/Switch';

const meta = {
    title: 'Switch',
    component: Switch,
    args: {
        label: 'Autoplay',
        disabled: false,
        onCheckedChange: fn(),
    },
    argTypes: {
        label: { control: 'text' },
    },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvas, userEvent, args }) => {
        const toggle = canvas.getByRole('switch', { name: 'Autoplay' });

        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-checked', 'true');

        await userEvent.keyboard(' ');
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
    },
};

export const Checked: Story = {
    args: { defaultChecked: true },
    play: async ({ canvas }) => {
        const toggle = canvas.getByRole('switch', { name: 'Autoplay' });
        // The label comes first, then the track with the thumb in it.
        const trackElement = toggle.lastElementChild as HTMLElement;
        const thumb = trackElement.firstElementChild as HTMLElement;
        const track = trackElement.getBoundingClientRect();
        // The thumb sits at the end of the track when the switch is on.
        await expect(
            track.right - thumb.getBoundingClientRect().right
        ).toBeLessThanOrEqual(4);
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const toggle = canvas.getByRole('switch', { name: 'Autoplay' });

        await userEvent.click(canvas.getByText('Autoplay'));
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await expect(args.onCheckedChange).not.toHaveBeenCalled();
    },
};

// A switch with no label doesn't take the labelled args of meta.
export const WithoutLabel: StoryObj<typeof Switch> = {
    args: { label: undefined, 'aria-label': 'Crossfade' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('switch', { name: 'Crossfade' })
        ).toBeInTheDocument();
    },
};
