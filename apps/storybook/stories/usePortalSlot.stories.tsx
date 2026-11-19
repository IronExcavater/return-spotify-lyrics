import { useEffect, useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import usePortalSlot from '@return-spotify-lyrics/ui/usePortalSlot';

const PLACES = ['header', 'sidebar', 'footer'] as const;

type Place = (typeof PLACES)[number];
type Option = Place | 'none';

const LABELS: Record<Option, string> = {
    header: 'Header',
    sidebar: 'Sidebar',
    footer: 'Footer',
    none: 'Nowhere',
};

type Args = { active: Option };

function findNext(place: Option): Place {
    const index = PLACES.indexOf(place as Place);
    return PLACES[(index + 1) % PLACES.length] ?? 'header';
}

const meta = {
    title: 'usePortalSlot',
    args: { active: 'header' },
    argTypes: {
        active: { control: 'inline-radio', options: Object.keys(LABELS) },
    },
    render: function Render(args) {
        // Story tests cannot change args, so the story keeps its own state, and the control sets it.
        const [active, choose] = useState(args.active);
        useEffect(() => choose(args.active), [args.active]);
        const name = useId();
        const place = active === 'none' ? undefined : active;

        const { slots, portal } = usePortalSlot(
            PLACES,
            place,
            <input
                aria-label="Search"
                placeholder="Type, then press Enter"
                className="w-full rounded-small border bg-transparent px-2 py-1"
                onKeyDown={(event) => {
                    if (event.key === 'Enter') choose(findNext(active));
                }}
            />
        );

        const area = (place: Place) => (
            <div
                role="group"
                aria-label={LABELS[place]}
                className="grid content-start gap-1 rounded-medium border border-dashed p-2"
            >
                <span className="text-small text-subdued">{LABELS[place]}</span>
                {slots[place]}
            </div>
        );

        return (
            <div className="grid gap-3 text-medium">
                <fieldset className="flex flex-wrap gap-3">
                    <legend className="mb-1">Show the field in</legend>
                    {Object.entries(LABELS).map(([option, label]) => (
                        <label key={option} className="flex items-center gap-1">
                            <input
                                type="radio"
                                name={name}
                                checked={active === option}
                                onChange={() => choose(option as Option)}
                            />
                            {label}
                        </label>
                    ))}
                </fieldset>
                <div className="grid grid-cols-[10rem_1fr] gap-2">
                    <div className="col-span-2">{area('header')}</div>
                    {area('sidebar')}
                    <div className="rounded-medium bg-raised p-2 text-subdued">
                        Page content
                    </div>
                    <div className="col-span-2">{area('footer')}</div>
                </div>
                {portal}
            </div>
        );
    },
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MoveBetweenSlots: Story = {
    play: async ({ canvas, userEvent, step }) => {
        const field = canvas.getByRole('textbox', { name: 'Search' });
        const area = (name: string) =>
            within(canvas.getByRole('group', { name }));

        await step(
            'Enter moves the field, and it keeps its text and focus',
            async () => {
                await userEvent.type(field, 'Lyrics{Enter}');
                await waitFor(() =>
                    expect(area('Sidebar').getByRole('textbox')).toBe(field)
                );
                await expect(field).toHaveValue('Lyrics');
                await expect(field).toHaveFocus();
            }
        );

        await step(
            'Keys after the move go on the end of the text',
            async () => {
                await userEvent.keyboard(' on');
                await expect(field).toHaveValue('Lyrics on');
            }
        );

        await step(
            'With no slot, the field leaves the page but keeps its text',
            async () => {
                await userEvent.click(
                    canvas.getByRole('radio', { name: 'Nowhere' })
                );
                await waitFor(() =>
                    expect(
                        canvas.queryByRole('textbox')
                    ).not.toBeInTheDocument()
                );
                await userEvent.click(
                    canvas.getByRole('radio', { name: 'Footer' })
                );
                await waitFor(() =>
                    expect(area('Footer').getByRole('textbox')).toBe(field)
                );
                await expect(field).toHaveValue('Lyrics on');
            }
        );
    },
};
