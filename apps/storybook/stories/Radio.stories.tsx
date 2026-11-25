import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import Radio from '@return-spotify-lyrics/ui/Radio';
import RadioGroup, {
    type RadioGroupProps,
} from '@return-spotify-lyrics/ui/RadioGroup';
import Text from '@return-spotify-lyrics/ui/Text';

import { TRACKS } from './shared';

type SortOrder = 'recent' | 'title' | 'artist';

// The group sorts a real list, so a person sees what each choice does.
// The scene owns the value, so it takes every prop of the group but the value props.
type SortedTracksProps = Omit<
    RadioGroupProps<unknown>,
    'value' | 'defaultValue' | 'onValueChange'
>;

function SortedTracks(props: SortedTracksProps) {
    const [order, setOrder] = useState<SortOrder>('recent');
    const tracks =
        order === 'recent'
            ? TRACKS
            : [...TRACKS].sort((a, b) => a[order].localeCompare(b[order]));

    return (
        <div className="grid w-72 gap-4">
            <RadioGroup
                {...props}
                value={order}
                onValueChange={(value) => setOrder(value)}
            >
                <Radio value="recent" label="Recently added" />
                <Radio value="title" label="Title" />
                <Radio value="artist" label="Artist" />
            </RadioGroup>
            <ol aria-label="Tracks" className="grid gap-1">
                {tracks.map(({ title, artist }) => (
                    <li key={title}>
                        <Text>{title}</Text>
                        <Text className="block text-small text-subdued">
                            {artist}
                        </Text>
                    </li>
                ))}
            </ol>
        </div>
    );
}

const meta = {
    title: 'Radio',
    component: RadioGroup,
    subcomponents: { Radio },
    args: {
        label: 'Sort by',
        orientation: 'vertical',
        disabled: false,
    },
    argTypes: {
        label: { control: 'text' },
    },
    render: (args) => <SortedTracks {...args} />,
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The arrow keys move through the options and choose each one, as the ARIA radio group pattern says. */
export const SortBy: Story = {
    play: async ({ canvas, userEvent, args }) => {
        const list = within(canvas.getByRole('list', { name: 'Tracks' }));
        const recent = canvas.getByRole('radio', { name: 'Recently added' });
        const title = canvas.getByRole('radio', { name: 'Title' });

        await expect(
            canvas.getByRole('radiogroup', { name: String(args.label) })
        ).toBeInTheDocument();
        await userEvent.click(recent);
        await userEvent.keyboard('{ArrowDown}');
        await expect(title).toHaveFocus();
        await expect(title).toHaveAttribute('aria-checked', 'true');
        await expect(list.getAllByRole('listitem')[0]).toHaveTextContent(
            'Glass Harbour'
        );

        await userEvent.keyboard('{ArrowDown}');
        await expect(list.getAllByRole('listitem')[0]).toHaveTextContent(
            'Ada Vale'
        );
    },
};

export const Horizontal: Story = {
    args: { orientation: 'horizontal' },
    play: async ({ canvas, userEvent }) => {
        const recent = canvas.getByRole('radio', { name: 'Recently added' });
        const title = canvas.getByRole('radio', { name: 'Title' });

        // The options sit on one line.
        await expect(
            Math.abs(
                recent.getBoundingClientRect().top -
                    title.getBoundingClientRect().top
            )
        ).toBeLessThanOrEqual(1);

        await userEvent.click(recent);
        await userEvent.keyboard('{ArrowRight}');
        await expect(title).toHaveAttribute('aria-checked', 'true');
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent }) => {
        const title = canvas.getByRole('radio', { name: 'Title' });

        await userEvent.click(canvas.getByText('Title'));
        await expect(title).toHaveAttribute('aria-checked', 'false');
    },
};
