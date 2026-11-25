import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Volume2, VolumeX } from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';
import Slider, { type SliderProps } from '@return-spotify-lyrics/ui/Slider';
import Text from '@return-spotify-lyrics/ui/Text';

// A track time in minutes and seconds, like 1:12.
function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// The seek bar shows the time on each side, as the player does.
function SeekBar(props: SliderProps) {
    const [position, setPosition] = useState(72);

    return (
        <div className="flex w-80 items-center gap-3 text-small text-subdued">
            <Text>{formatTime(position)}</Text>
            <Slider
                {...props}
                value={position}
                onValueChange={(value) => {
                    if (typeof value === 'number') setPosition(value);
                }}
                className="flex-1"
            />
            <Text>{formatTime(props.max ?? 0)}</Text>
        </div>
    );
}

const meta = {
    title: 'Slider',
    component: Slider,
    args: {
        thumbLabels: ['Seek'],
        min: 0,
        max: 225,
        step: 1,
        largeStep: 10,
        orientation: 'horizontal',
        disabled: false,
        formatValue: (value: number) => `${formatTime(value)} of 3:45`,
        onValueCommitted: fn(),
    },
    argTypes: {
        formatValue: { control: false },
        marks: { control: 'object' },
    },
    render: (args) => <SeekBar {...args} />,
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The seek bar of the player. The arrow keys move a second, Page Up moves ten, and a screen reader hears the time. */
export const Seek: Story = {
    play: async ({ canvas, userEvent, args, step }) => {
        const thumb = canvas.getByRole('slider', { name: 'Seek' });

        await step('The thumb says the time, not a number', async () => {
            await expect(thumb).toHaveAttribute(
                'aria-valuetext',
                '1:12 of 3:45'
            );
        });

        await step('The arrow keys and Page Up move it', async () => {
            await userEvent.tab();
            await expect(thumb).toHaveFocus();
            await userEvent.keyboard('{ArrowRight}');
            await expect(thumb).toHaveAttribute('aria-valuenow', '73');
            await userEvent.keyboard('{PageUp}');
            await expect(thumb).toHaveAttribute('aria-valuenow', '83');
            await expect(canvas.getByText('1:23')).toBeVisible();
            await expect(args.onValueCommitted).toHaveBeenCalled();
        });
    },
};

// The volume slider sits next to a mute button, and the two share the volume state.
function VolumeControl(props: SliderProps) {
    const [volume, setVolume] = useState(60);
    const isMuted = volume === 0;

    return (
        <div className="flex w-48 items-center gap-1">
            <Button
                variant="tertiary"
                size="small"
                icon={isMuted ? <VolumeX /> : <Volume2 />}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                onClick={() => setVolume(isMuted ? 60 : 0)}
            />
            <Slider
                {...props}
                value={volume}
                onValueChange={(value) => {
                    if (typeof value === 'number') setVolume(value);
                }}
                className="flex-1"
            />
        </div>
    );
}

/** A volume slider and a mute button change the same value, so each one shows what the other did. */
export const Volume: Story = {
    args: {
        thumbLabels: ['Volume'],
        max: 100,
        formatValue: (value: number) => `${value}%`,
    },
    render: (args) => <VolumeControl {...args} />,
    play: async ({ canvas, userEvent }) => {
        const volume = canvas.getByRole('slider', { name: 'Volume' });
        await userEvent.click(canvas.getByRole('button', { name: 'Mute' }));
        await expect(volume).toHaveAttribute('aria-valuenow', '0');
        await expect(
            canvas.getByRole('button', { name: 'Unmute' })
        ).toBeInTheDocument();
    },
};

/** Two thumbs pick a range, like the tempo of a playlist filter, and the marks show the common tempos. */
export const TempoRange: Story = {
    args: {
        label: 'Tempo',
        thumbLabels: ['Lowest tempo', 'Highest tempo'],
        min: 60,
        max: 180,
        step: 5,
        defaultValue: [90, 140],
        marks: [60, 90, 120, 150, 180],
        formatValue: (value: number) => `${value} beats a minute`,
    },
    render: (args) => <Slider {...args} className="w-72" />,
    play: async ({ canvas, userEvent }) => {
        const lowest = canvas.getByRole('slider', { name: 'Lowest tempo' });
        const highest = canvas.getByRole('slider', { name: 'Highest tempo' });
        await expect(highest).toHaveAttribute('aria-valuenow', '140');

        await userEvent.tab();
        await expect(lowest).toHaveFocus();
        await userEvent.keyboard('{ArrowRight}');
        await expect(lowest).toHaveAttribute('aria-valuenow', '95');
        await expect(lowest).toHaveAttribute(
            'aria-valuetext',
            '95 beats a minute'
        );
    },
};

/** Up and down, like the seek bar of the lyric creator, where height is time. Arrow Up moves it on. */
export const Vertical: Story = {
    args: {
        thumbLabels: ['Song position'],
        orientation: 'vertical',
        defaultValue: 72,
    },
    render: (args) => (
        <div className="h-48">
            <Slider {...args} />
        </div>
    ),
    play: async ({ canvas, userEvent }) => {
        const thumb = canvas.getByRole('slider', { name: 'Song position' });
        await userEvent.tab();
        await userEvent.keyboard('{ArrowUp}');
        await expect(thumb).toHaveAttribute('aria-valuenow', '73');
        await expect(thumb).toHaveAttribute('aria-orientation', 'vertical');
    },
};
