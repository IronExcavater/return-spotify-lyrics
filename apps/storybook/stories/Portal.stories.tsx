import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import Portal from '@return-spotify-lyrics/ui/Portal';
import usePortalSlot from '@return-spotify-lyrics/ui/usePortalSlot';

const TRACKS = [
    { title: 'Glass Harbour', artist: 'Lumen Fields' },
    { title: 'Paper Satellites', artist: 'The Quiet Hours' },
    { title: 'Northern Static', artist: 'Ada Vale' },
    { title: 'Slow Orbit', artist: 'Marlow Coast' },
];

type Track = (typeof TRACKS)[number];

const BUTTON =
    'shrink-0 rounded-full border px-3 py-1 text-small transition-colors duration-fast hover:bg-tint active:bg-shade';

type TrackRowProps = {
    track: Track;
    messages: HTMLElement | null;
};

function TrackRow({ track, messages }: TrackRowProps) {
    const [queued, setQueued] = useState(false);

    return (
        <li className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
                <div className="truncate">{track.title}</div>
                <div className="truncate text-small text-subdued">
                    {track.artist}
                </div>
            </div>
            <button className={BUTTON} onClick={() => setQueued(!queued)}>
                {queued ? 'Remove from queue' : 'Add to queue'}
            </button>
            {queued && messages && (
                <Portal container={messages}>
                    <div className="flex items-center gap-3 rounded-medium bg-overlay px-3 py-2 shadow-overlay">
                        <span className="flex-1">
                            Added {track.title} to the queue
                        </span>
                        <button
                            className={BUTTON}
                            onClick={() => setQueued(false)}
                        >
                            Undo
                        </button>
                    </div>
                </Portal>
            )}
        </li>
    );
}

function QueueDemo() {
    const [messages, setMessages] = useState<HTMLElement | null>(null);

    return (
        <div className="grid max-w-md gap-3 text-medium">
            <p className="text-small text-subdued">
                The list clips what is inside it. Each row writes its message
                inside itself, and Portal shows the message below the list. The
                message stays in the row&apos;s React tree, so Undo changes the
                row.
            </p>
            <ul
                aria-label="Tracks"
                className="h-32 divide-y overflow-y-auto rounded-medium bg-raised"
            >
                {TRACKS.map((track) => (
                    <TrackRow
                        key={track.title}
                        track={track}
                        messages={messages}
                    />
                ))}
            </ul>
            <div
                ref={setMessages}
                role="status"
                aria-label="Messages"
                className="grid min-h-14 content-start gap-2 rounded-medium border border-dashed p-2"
            />
        </div>
    );
}

const PLACES = ['header', 'sidebar', 'footer'] as const;

type Place = (typeof PLACES)[number];
type Option = Place | 'none';

const LABELS: Record<Option, string> = {
    header: 'Header',
    sidebar: 'Sidebar',
    footer: 'Footer',
    none: 'Nowhere',
};

function findNext(place: Option): Place {
    const index = PLACES.indexOf(place as Place);
    return PLACES[(index + 1) % PLACES.length] ?? 'header';
}

function SlotsDemo() {
    const [active, choose] = useState<Option>('header');
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
            <p className="text-small text-subdued">
                usePortalSlot moves one field between three slots without a
                remount, so the field keeps its text and focus.
            </p>
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
}

const meta = {
    title: 'Portal',
    component: Portal,
    // Each demo makes its own container, so the stories have no args to set.
    args: {},
    render: () => <QueueDemo />,
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const IntoContainer: Story = {
    play: async ({ canvas, userEvent, step }) => {
        const list = canvas.getByRole('list', { name: 'Tracks' });
        const messages = within(
            canvas.getByRole('status', { name: 'Messages' })
        );
        const [add] = canvas.getAllByRole('button', { name: 'Add to queue' });

        await step('A row shows its message outside the list', async () => {
            await userEvent.click(add!);
            const message = await messages.findByText(
                'Added Glass Harbour to the queue'
            );
            await expect(list).not.toContainElement(message);
        });

        await step('Undo in the message changes the row', async () => {
            await userEvent.click(
                messages.getByRole('button', { name: 'Undo' })
            );
            await waitFor(() =>
                expect(messages.queryByText(/Added/)).not.toBeInTheDocument()
            );
            await expect(add).toHaveTextContent('Add to queue');
        });
    },
};

export const MoveBetweenSlots: Story = {
    render: () => <SlotsDemo />,
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
