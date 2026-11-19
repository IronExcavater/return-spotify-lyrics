import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import {
    AArrowUp,
    ListMusic,
    MicVocal,
    Trash2,
} from '@return-spotify-lyrics/icons';
import Portal from '@return-spotify-lyrics/ui/Portal';

import { ICON_BUTTON, Surface, TRACKS } from './shared';

const LYRICS = [
    'Lights on the water',
    'Paper boats in the harbour',
    'We sail until the morning',
    'And the city falls asleep',
];

type PageProps = {
    actions: HTMLElement | null;
};

// The queue lives in this page, and its action shows in the app bar.
function QueuePage({ actions }: PageProps) {
    const [tracks, setTracks] = useState(TRACKS);

    return (
        <>
            <ul aria-label="Queue" className="divide-y">
                {tracks.map((track) => (
                    <li key={track.title} className="py-2">
                        {track.title}
                        <div className="text-small text-subdued">
                            {track.artist}
                        </div>
                    </li>
                ))}
            </ul>
            {tracks.length === 0 && (
                <p className="text-subdued">The queue is empty.</p>
            )}
            {actions && (
                <Portal container={actions}>
                    <button
                        aria-label="Clear the queue"
                        className={ICON_BUTTON}
                        onClick={() => setTracks([])}
                    >
                        <Trash2 aria-hidden className="size-4" />
                    </button>
                </Portal>
            )}
        </>
    );
}

function LyricsPage({ actions }: PageProps) {
    const [large, setLarge] = useState(false);

    return (
        <>
            <div
                className={`grid gap-2 ${large ? 'text-xx-large' : 'text-x-large'}`}
            >
                {LYRICS.map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </div>
            {actions && (
                <Portal container={actions}>
                    <button
                        aria-label="Larger text"
                        aria-pressed={large}
                        className={ICON_BUTTON}
                        onClick={() => setLarge(!large)}
                    >
                        <AArrowUp aria-hidden className="size-4" />
                    </button>
                </Portal>
            )}
        </>
    );
}

const PAGES = [
    { page: 'queue', label: 'Queue', Icon: ListMusic, Page: QueuePage },
    { page: 'lyrics', label: 'Lyrics', Icon: MicVocal, Page: LyricsPage },
] as const;

type Page = (typeof PAGES)[number]['page'];

function PageActionsDemo() {
    const [page, setPage] = useState<Page>('queue');
    const [actions, setActions] = useState<HTMLElement | null>(null);
    const { Page } = PAGES.find((item) => item.page === page) ?? PAGES[0];

    const bar = (
        <>
            <nav aria-label="Pages" className="flex">
                {PAGES.map(({ page: target, label, Icon }) => (
                    <button
                        key={target}
                        aria-label={label}
                        aria-current={page === target ? 'page' : undefined}
                        className={ICON_BUTTON}
                        onClick={() => setPage(target)}
                    >
                        <Icon aria-hidden className="size-4" />
                    </button>
                ))}
            </nav>
            <div ref={setActions} className="ml-auto flex" />
        </>
    );

    return (
        <Surface bar={bar}>
            <Page actions={actions} />
        </Surface>
    );
}

const meta = {
    title: 'Portal/Portal',
    component: Portal,
    // The demo makes its own container, so the story has no args to set.
    args: {},
    render: () => <PageActionsDemo />,
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PageActions: Story = {
    play: async ({ canvas, userEvent, step }) => {
        const bar = within(canvas.getByRole('banner'));

        await step('A page shows its action in the app bar', async () => {
            await userEvent.click(
                await bar.findByRole('button', { name: 'Clear the queue' })
            );
            await expect(
                canvas.getByText('The queue is empty.')
            ).toBeInTheDocument();
        });

        await step('Another page shows its own action', async () => {
            await userEvent.click(bar.getByRole('button', { name: 'Lyrics' }));
            await waitFor(() =>
                expect(
                    bar.queryByRole('button', { name: 'Clear the queue' })
                ).not.toBeInTheDocument()
            );
            const larger = bar.getByRole('button', { name: 'Larger text' });
            await userEvent.click(larger);
            await expect(larger).toHaveAttribute('aria-pressed', 'true');
        });
    },
};
