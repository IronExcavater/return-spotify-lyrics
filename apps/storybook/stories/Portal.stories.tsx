import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import {
    AArrowUp,
    ArrowDownUp,
    House,
    ListMusic,
    MicVocal,
    Pause,
    Play,
    Search,
    Shuffle,
    Trash2,
} from '@return-spotify-lyrics/icons';
import Portal from '@return-spotify-lyrics/ui/Portal';
import usePortalSlot from '@return-spotify-lyrics/ui/usePortalSlot';

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

const ROUTES = ['home', 'search', 'lyrics'] as const;

type Route = (typeof ROUTES)[number];

const NAV = [
    { route: 'home', label: 'Home', Icon: House },
    { route: 'search', label: 'Search', Icon: Search },
    { route: 'lyrics', label: 'Lyrics', Icon: MicVocal },
] as const;

type ControlsProps = {
    route: Route;
    onRouteChange: (route: Route) => void;
};

// The shuffle state lives here, so a remount would reset it.
function Controls({ route, onRouteChange }: ControlsProps) {
    const [shuffle, setShuffle] = useState(false);

    return (
        <nav aria-label="Main" className="ml-auto flex">
            {NAV.map(({ route: target, label, Icon }) => (
                <button
                    key={target}
                    aria-label={label}
                    aria-current={route === target ? 'page' : undefined}
                    className={ICON_BUTTON}
                    onClick={() => onRouteChange(target)}
                >
                    <Icon aria-hidden className="size-4" />
                </button>
            ))}
            <button
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={ICON_BUTTON}
                onClick={() => setShuffle(!shuffle)}
            >
                <Shuffle aria-hidden className="size-4" />
            </button>
        </nav>
    );
}

function SharedControlsDemo() {
    const [route, setRoute] = useState<Route>('home');
    const { slots, portal } = usePortalSlot(
        ROUTES,
        route,
        <Controls route={route} onRouteChange={setRoute} />
    );

    // Each route has its own app bar, and the shared controls move into the one on screen.
    const bars: Record<Route, ReactNode> = {
        home: (
            <>
                <strong className="text-large">Good evening</strong>
                {slots.home}
            </>
        ),
        search: (
            <>
                <input
                    aria-label="Search Spotify"
                    placeholder="Songs, artists, lyrics"
                    className="min-w-0 flex-1 rounded-full bg-raised px-3 py-1"
                />
                {slots.search}
            </>
        ),
        lyrics: (
            <>
                <span className="min-w-0 truncate">{TRACKS[0]?.title}</span>
                {slots.lyrics}
            </>
        ),
    };

    return (
        <>
            <Surface bar={bars[route]}>
                <p className="text-subdued">
                    The {route} page. The buttons in the app bar keep their
                    state and focus when the route changes the bar.
                </p>
            </Surface>
            {portal}
        </>
    );
}

const POSITIONS = ['top', 'bottom'] as const;

type Position = (typeof POSITIONS)[number];

type PlayerProps = {
    position: Position;
    onMove: () => void;
};

// The play state lives here, so a remount would stop the track.
function Player({ position, onMove }: PlayerProps) {
    const [playing, setPlaying] = useState(false);
    const PlayIcon = playing ? Pause : Play;
    const other = position === 'top' ? 'bottom' : 'top';

    return (
        <div
            role="group"
            aria-label="Player"
            className="flex w-full items-center gap-1"
        >
            <button
                aria-label={playing ? 'Pause' : 'Play'}
                className={ICON_BUTTON}
                onClick={() => setPlaying(!playing)}
            >
                <PlayIcon aria-hidden className="size-4" />
            </button>
            <span className="min-w-0 flex-1 truncate">{TRACKS[1]?.title}</span>
            <button
                aria-label={`Move the player to the ${other}`}
                className={ICON_BUTTON}
                onClick={onMove}
            >
                <ArrowDownUp aria-hidden className="size-4" />
            </button>
        </div>
    );
}

function PlayerPositionDemo() {
    const [position, setPosition] = useState<Position>('bottom');
    const { slots, portal } = usePortalSlot(
        POSITIONS,
        position,
        <Player
            position={position}
            onMove={() => setPosition(position === 'top' ? 'bottom' : 'top')}
        />
    );

    return (
        <>
            <Surface bar={slots.top}>
                <ul aria-label="Queue" className="divide-y">
                    {TRACKS.map((track) => (
                        <li key={track.title} className="py-2">
                            {track.title}
                            <div className="text-small text-subdued">
                                {track.artist}
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="sticky bottom-0 bg-default">{slots.bottom}</div>
            </Surface>
            {portal}
        </>
    );
}

const meta = {
    title: 'Portal',
    component: Portal,
    // The demos make their own containers, so the stories have no args to set.
    args: {},
    render: () => <PageActionsDemo />,
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `Portal` shows content from a page in another element, like the app bar. */
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

/** `usePortalSlot` moves one mounted child between slots, so controls keep their state when the layout changes. */
export const SharedControls: Story = {
    render: () => <SharedControlsDemo />,
    play: async ({ canvas, userEvent, step }) => {
        const nav = within(canvas.getByRole('navigation', { name: 'Main' }));
        const shuffle = nav.getByRole('button', { name: 'Shuffle' });
        const search = nav.getByRole('button', { name: 'Search' });

        await step('A new route moves the controls into its bar', async () => {
            await userEvent.click(shuffle);
            await userEvent.click(search);
            await waitFor(() =>
                expect(
                    canvas.getByRole('textbox', { name: 'Search Spotify' })
                ).toBeInTheDocument()
            );
            await expect(search).toHaveAttribute('aria-current', 'page');
        });

        await step('The controls keep their state and focus', async () => {
            await expect(shuffle).toHaveAttribute('aria-pressed', 'true');
            await expect(search).toHaveFocus();
        });

        await step(
            'The keyboard can go on from the moved controls',
            async () => {
                await userEvent.keyboard('{Tab}{Enter}');
                await expect(
                    nav.getByRole('button', { name: 'Lyrics' })
                ).toHaveFocus();
                await expect(
                    nav.getByRole('button', { name: 'Lyrics' })
                ).toHaveAttribute('aria-current', 'page');
            }
        );
    },
};

/** A slot can sit anywhere, like the top or the bottom of a page. */
export const PlayerPosition: Story = {
    render: () => <PlayerPositionDemo />,
    play: async ({ canvas, userEvent }) => {
        const player = within(canvas.getByRole('group', { name: 'Player' }));
        const banner = canvas.getByRole('banner');

        await userEvent.click(player.getByRole('button', { name: 'Play' }));
        const move = player.getByRole('button', {
            name: 'Move the player to the top',
        });
        await userEvent.click(move);

        await waitFor(() =>
            expect(
                within(banner).getByRole('group', { name: 'Player' })
            ).toBeInTheDocument()
        );
        await expect(
            player.getByRole('button', { name: 'Pause' })
        ).toBeInTheDocument();
        await expect(move).toHaveFocus();
    },
};
