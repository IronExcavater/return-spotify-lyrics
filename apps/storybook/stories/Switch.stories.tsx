import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import Switch from '@return-spotify-lyrics/ui/Switch';
import Text from '@return-spotify-lyrics/ui/Text';

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
    // A switch turns a setting on at once, so the stories show a settings list, and the first switch takes the args.
    render: (args) => (
        <div className="grid w-72 gap-3">
            <Text render={<h3 />} className="font-bold">
                Playback
            </Text>
            <Switch {...args} className="justify-between" />
            <Switch
                label="Crossfade songs"
                defaultChecked
                className="justify-between"
            />
            <Switch label="Normalise volume" className="justify-between" />
        </div>
    ),
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Settings: Story = {
    play: async ({ canvas, userEvent, args, step }) => {
        const toggle = canvas.getByRole('switch', { name: String(args.label) });

        await step('A click and Space each turn the setting over', async () => {
            await userEvent.click(toggle);
            await expect(toggle).toHaveAttribute('aria-checked', 'true');
            await userEvent.keyboard(' ');
            await expect(toggle).toHaveAttribute('aria-checked', 'false');
            await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
        });

        await step(
            'The thumb of a switch that is on sits at the end',
            async () => {
                const on = canvas.getByRole('switch', {
                    name: 'Crossfade songs',
                });
                await expect(on).toHaveAttribute('aria-checked', 'true');
                // The label comes first, then the track with the thumb in it.
                const track = on.lastElementChild as HTMLElement;
                const thumb = track.firstElementChild as HTMLElement;
                await expect(
                    track.getBoundingClientRect().right -
                        thumb.getBoundingClientRect().right
                ).toBeLessThanOrEqual(4);
            }
        );
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const toggle = canvas.getByRole('switch', { name: String(args.label) });

        await userEvent.click(canvas.getByText(String(args.label)));
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await expect(args.onCheckedChange).not.toHaveBeenCalled();
    },
};
