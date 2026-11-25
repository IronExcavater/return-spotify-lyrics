import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Heart, Music, Repeat, Shuffle } from '@return-spotify-lyrics/icons';
import Button from '@return-spotify-lyrics/ui/Button';
import Separator from '@return-spotify-lyrics/ui/Separator';
import Switch from '@return-spotify-lyrics/ui/Switch';
import Text from '@return-spotify-lyrics/ui/Text';

import { lengthControl } from './controls';

const meta = {
    title: 'Separator',
    component: Separator,
    args: {
        orientation: 'horizontal',
        variant: 'line',
        decorative: false,
    },
    argTypes: {
        size: lengthControl,
        gap: lengthControl,
        children: { control: false },
    },
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A line splits the groups of a settings page, and assistive technology hears where one group ends. */
export const Sections: Story = {
    render: (args) => (
        <div className="grid w-64 gap-3">
            <Text render={<h3 />} className="font-bold">
                Playback
            </Text>
            <Switch label="Autoplay" />
            <Separator {...args} />
            <Text render={<h3 />} className="font-bold">
                Lyrics
            </Text>
            <Switch label="Show lyrics in the side panel" />
        </div>
    ),
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('separator')).toHaveAttribute(
            'aria-orientation',
            'horizontal'
        );
    },
};

/** Dots split the parts of a track's details. They only decorate, so a screen reader reads the words alone. */
export const TrackDetails: Story = {
    args: { orientation: 'vertical', variant: 'dot', decorative: true },
    render: (args) => (
        <div className="flex flex-wrap items-center text-small text-subdued">
            <Text>Single</Text>
            <Separator {...args} />
            <Text>The Quiet Hours</Text>
            <Separator {...args} />
            <Text>2026</Text>
            <Separator {...args} />
            <Text>3 min 12 s</Text>
        </div>
    ),
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('separator')).not.toBeInTheDocument();
    },
};

/** A vertical line splits a group of controls in a row, and it takes the height of the row. */
export const Toolbar: Story = {
    args: { orientation: 'vertical', gap: 4 },
    render: (args) => (
        <div
            role="group"
            aria-label="Player"
            className="flex h-10 items-center"
        >
            <Button
                variant="tertiary"
                icon={<Shuffle />}
                aria-label="Shuffle"
            />
            <Button variant="tertiary" icon={<Repeat />} aria-label="Repeat" />
            <Separator {...args} />
            <Button variant="tertiary" icon={<Heart />} aria-label="Like" />
        </div>
    ),
    play: async ({ canvas }) => {
        const separator = canvas.getByRole('separator');
        await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
        await expect(separator.getBoundingClientRect().height).toBeGreaterThan(
            0
        );
    },
};

/** Any node can be the mark, like an icon, and it takes the size of the text around it. */
export const CustomMark: Story = {
    args: {
        orientation: 'vertical',
        decorative: true,
        children: <Music aria-hidden data-testid="mark" />,
    },
    render: (args) => (
        <div className="flex items-center text-medium">
            <Text>Glass Harbour</Text>
            <Separator {...args} />
            <Text>Slow Orbit</Text>
        </div>
    ),
    play: async ({ canvas }) => {
        const mark = canvas.getByTestId('mark');
        const fontSize = parseFloat(getComputedStyle(mark).fontSize);
        await expect(
            Math.abs(mark.getBoundingClientRect().height - fontSize)
        ).toBeLessThanOrEqual(1);
    },
};
