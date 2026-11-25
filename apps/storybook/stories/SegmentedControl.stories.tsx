import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import {
    ArrowDownNarrowWide,
    ArrowUpNarrowWide,
    LayoutGrid,
    List,
} from '@return-spotify-lyrics/icons';
import SegmentedControl, {
    type SegmentedControlProps,
} from '@return-spotify-lyrics/ui/SegmentedControl';
import Text from '@return-spotify-lyrics/ui/Text';

import { TRACKS } from './shared';

// The control switches a real library between a list and a grid, so a person sees what each segment does.
function LibraryView(props: SegmentedControlProps) {
    const [view, setView] = useState('list');
    const isGrid = view === 'grid';

    return (
        <div className="grid w-80 gap-4">
            <SegmentedControl
                {...props}
                value={view}
                onValueChange={(next) => {
                    props.onValueChange?.(next);
                    setView(next);
                }}
                className="justify-self-start"
            />
            <ul
                aria-label="Your library"
                className={isGrid ? 'grid grid-cols-2 gap-3' : 'grid gap-2'}
            >
                {TRACKS.map(({ title, artist }) => (
                    <li
                        key={title}
                        className={
                            isGrid ? 'grid gap-1' : 'flex items-center gap-3'
                        }
                    >
                        <div
                            className={`shrink-0 rounded-small bg-overlay ${isGrid ? 'aspect-square' : 'size-10'}`}
                        />
                        <div className="min-w-0">
                            <Text className="block truncate">{title}</Text>
                            <Text className="block text-small text-subdued">
                                {artist}
                            </Text>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const meta = {
    title: 'SegmentedControl',
    component: SegmentedControl,
    args: {
        'aria-label': 'Library view',
        options: [
            { value: 'list', label: 'List', icon: <List /> },
            { value: 'grid', label: 'Grid', icon: <LayoutGrid /> },
        ],
        disabled: false,
        onValueChange: fn(),
    },
    argTypes: {
        options: { control: false },
    },
    render: (args) => <LibraryView {...args} />,
} satisfies Meta<typeof SegmentedControl>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A click or the keyboard chooses a view, and a press on the chosen view keeps it chosen. */
export const Library: Story = {
    play: async ({ canvas, userEvent, args, step }) => {
        const group = within(
            canvas.getByRole('group', { name: 'Library view' })
        );
        const list = group.getByRole('button', { name: 'List' });
        const grid = group.getByRole('button', { name: 'Grid' });

        await step('A click chooses the grid', async () => {
            await userEvent.click(grid);
            await expect(grid).toHaveAttribute('aria-pressed', 'true');
            await expect(list).toHaveAttribute('aria-pressed', 'false');
            await expect(args.onValueChange).toHaveBeenLastCalledWith('grid');
        });

        await step('A press on the chosen view keeps it chosen', async () => {
            await userEvent.click(grid);
            await expect(grid).toHaveAttribute('aria-pressed', 'true');
        });

        await step('The arrow keys move, and Enter chooses', async () => {
            await userEvent.keyboard('{ArrowLeft}');
            await expect(list).toHaveFocus();
            await userEvent.keyboard('{Enter}');
            await expect(list).toHaveAttribute('aria-pressed', 'true');
        });
    },
};

/** Icon segments have no text, so each one takes its name from `aria-label`. */
export const IconOnly: Story = {
    args: {
        'aria-label': 'Sort order',
        options: [
            {
                value: 'ascending',
                icon: <ArrowUpNarrowWide />,
                'aria-label': 'Oldest first',
            },
            {
                value: 'descending',
                icon: <ArrowDownNarrowWide />,
                'aria-label': 'Newest first',
            },
        ],
    },
    render: (args) => <SegmentedControl {...args} />,
    play: async ({ canvas, userEvent }) => {
        const newest = canvas.getByRole('button', { name: 'Newest first' });
        await userEvent.click(newest);
        await expect(newest).toHaveAttribute('aria-pressed', 'true');
        const { width, height } = newest.getBoundingClientRect();
        await expect(Math.abs(width - height)).toBeLessThanOrEqual(1);
    },
};
