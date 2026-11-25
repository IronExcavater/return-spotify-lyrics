import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import Checkbox from '@return-spotify-lyrics/ui/Checkbox';
import Text from '@return-spotify-lyrics/ui/Text';

import { TRACKS } from './shared';

const meta = {
    title: 'Checkbox',
    component: Checkbox,
    args: {
        label: 'Show lyrics in the side panel',
        indeterminate: false,
        disabled: false,
        onCheckedChange: fn(),
    },
    argTypes: {
        label: { control: 'text' },
    },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The label is part of the control, so a click on it toggles the box, and Space does too. */
export const Default: Story = {
    play: async ({ canvas, userEvent, args }) => {
        const checkbox = canvas.getByRole('checkbox', {
            name: String(args.label),
        });

        await userEvent.click(canvas.getByText(String(args.label)));
        await expect(checkbox).toHaveAttribute('aria-checked', 'true');

        await userEvent.keyboard(' ');
        await expect(checkbox).toHaveAttribute('aria-checked', 'false');
        await expect(checkbox).toHaveFocus();
        await expect(args.onCheckedChange).toHaveBeenCalledTimes(2);
    },
};

// The header box shows "some" while only some tracks are checked, like the track table of a playlist.
function TrackSelection() {
    const [selected, setSelected] = useState<string[]>([]);
    const isAll = selected.length === TRACKS.length;
    const isSome = selected.length > 0 && !isAll;
    const titles = TRACKS.map((track) => track.title);

    return (
        <div className="grid w-72 gap-2">
            <div className="flex items-center gap-3 border-b border-faint pb-2 text-small text-subdued">
                <Checkbox
                    aria-label="Select all tracks"
                    checked={isAll}
                    indeterminate={isSome}
                    onCheckedChange={(checked) =>
                        setSelected(checked ? titles : [])
                    }
                />
                <Text>Title</Text>
            </div>
            {TRACKS.map(({ title, artist }) => (
                <Checkbox
                    key={title}
                    label={
                        <>
                            {title}
                            <Text className="text-small text-subdued">
                                {` · ${artist}`}
                            </Text>
                        </>
                    }
                    checked={selected.includes(title)}
                    onCheckedChange={(checked) =>
                        setSelected((previous) =>
                            checked
                                ? [...previous, title]
                                : previous.filter((item) => item !== title)
                        )
                    }
                />
            ))}
        </div>
    );
}

/** A header box with no visible label selects every track, and shows a mixed state while only some are selected. */
export const SelectAll: Story = {
    // The scene keeps its own state, so the controls of meta don't reach it.
    parameters: { controls: { disable: true } },
    render: () => <TrackSelection />,
    play: async ({ canvas, userEvent, step }) => {
        const all = canvas.getByRole('checkbox', { name: 'Select all tracks' });
        const tracks = canvas
            .getAllByRole('checkbox')
            .filter((checkbox) => checkbox !== all);

        await step('One track makes the header box mixed', async () => {
            await userEvent.click(tracks[0]!);
            await expect(all).toHaveAttribute('aria-checked', 'mixed');
        });

        await step('The header box selects every track', async () => {
            await userEvent.click(all);
            for (const track of tracks) {
                await expect(track).toHaveAttribute('aria-checked', 'true');
            }
        });

        await step('The header box clears every track', async () => {
            await userEvent.click(all);
            for (const track of tracks) {
                await expect(track).toHaveAttribute('aria-checked', 'false');
            }
        });
    },
};

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        const checkbox = canvas.getByRole('checkbox');

        await userEvent.click(canvas.getByText(String(args.label)));
        await expect(checkbox).toHaveAttribute('aria-checked', 'false');
        await expect(args.onCheckedChange).not.toHaveBeenCalled();
    },
};

/** Every prop reaches the element a person points at, so a pointer handler fires on the label too. */
export const PropsReachTheRoot: Story = {
    args: { onPointerEnter: fn() },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.hover(canvas.getByText(String(args.label)));
        await expect(args.onPointerEnter).toHaveBeenCalled();
    },
};
