import { useMemo } from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, Text } from '@radix-ui/themes';
import type { SimplifiedAlbum, SimplifiedTrack } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';

import { formatDurationShort, formatIsoDate } from '../../shared/date';
import { resolveLocale } from '../../shared/locale';
import {
    albumToItem,
    albumTrackToItem,
    formatAlbumType,
} from '../../shared/media';
import { buildMediaActions } from '../helpers/mediaActions';
import { useScrollFade } from '../hooks/useScrollFade';
import { MediaRow } from './MediaRow';

export type DiscographyEntry = {
    album: SimplifiedAlbum;
    tracks: SimplifiedTrack[];
};

type SortOrder = 'newest' | 'oldest';

type Props = {
    entries: DiscographyEntry[];
    sort: SortOrder;
    onSortChange: (next: SortOrder) => void;
    trackCount: number;
    locale?: string;
    onAlbumClick: (album: SimplifiedAlbum) => void;
    onTrackClick: (track: SimplifiedTrack, album: SimplifiedAlbum) => void;
    cardWidth?: number;
};

type AlbumCardProps = {
    entry: DiscographyEntry;
    trackCount: number;
    cardWidth: number;
    onAlbumClick: (album: SimplifiedAlbum) => void;
    onTrackClick: (track: SimplifiedTrack, album: SimplifiedAlbum) => void;
};

function DiscographyAlbumCard({
    entry,
    trackCount,
    cardWidth,
    onAlbumClick,
    onTrackClick,
}: AlbumCardProps) {
    const album = entry.album;
    const albumItem = albumToItem(album);
    const albumActions = buildMediaActions(albumItem);
    const hasAlbumActions =
        albumActions.primary.length > 0 || albumActions.secondary.length > 0;
    const tracks = entry.tracks.slice(0, trackCount);
    const albumType = formatAlbumType(album);
    const subtitle = [
        album.artists?.map((artist) => artist.name).join(', '),
        albumType,
    ]
        .filter(Boolean)
        .join(' \u2022 ');

    const renderTrackRow = (track: SimplifiedTrack) => {
        const item = albumTrackToItem(track, album);
        const duration = formatDurationShort(track.duration_ms);
        const canClick = !!track.id;

        return (
            <Flex
                key={track.id ?? track.name}
                align="center"
                justify="between"
                gap="2"
                className={clsx(
                    'text-[12px]',
                    canClick &&
                        'cursor-pointer text-[var(--gray-12)] hover:text-[var(--accent-9)]'
                )}
                onClick={() => {
                    if (!canClick) return;
                    onTrackClick(track, album);
                }}
            >
                <span className="min-w-0 truncate">{item.title}</span>
                <Text size="1" color="gray" className="shrink-0">
                    {duration}
                </Text>
            </Flex>
        );
    };

    return (
        <Flex
            direction="column"
            gap="1"
            p="1"
            className="rounded-2 flex-none bg-[var(--color-panel-solid)]/5"
            style={{ width: cardWidth }}
        >
            <Flex align="start" gap="2">
                <Flex direction="column" className="min-w-0 flex-1">
                    <MediaRow
                        title={album.name}
                        subtitle={subtitle}
                        subtitleHeight={16}
                        imageUrl={album.images?.[0]?.url}
                        onClick={() => onAlbumClick(album)}
                        contextMenu={
                            hasAlbumActions ? (
                                <DropdownMenu.Content align="end" size="1">
                                    {albumActions.primary.map((action) => (
                                        <DropdownMenu.Item
                                            key={action.id}
                                            shortcut={action.shortcut}
                                            onSelect={() => action.onSelect()}
                                        >
                                            {action.label}
                                        </DropdownMenu.Item>
                                    ))}
                                    {albumActions.primary.length > 0 &&
                                        albumActions.secondary.length > 0 && (
                                            <DropdownMenu.Separator />
                                        )}
                                    {albumActions.secondary.map((action) => (
                                        <DropdownMenu.Item
                                            key={action.id}
                                            shortcut={action.shortcut}
                                            onSelect={() => action.onSelect()}
                                        >
                                            {action.label}
                                        </DropdownMenu.Item>
                                    ))}
                                </DropdownMenu.Content>
                            ) : null
                        }
                    />
                </Flex>
            </Flex>

            <Flex direction="column" gap="1">
                {tracks.map((track) => renderTrackRow(track))}
            </Flex>
        </Flex>
    );
}

const parseReleaseDate = (album: SimplifiedAlbum) => {
    const raw = album.release_date;
    if (!raw) return Number.NaN;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    return Number.NaN;
};

export function DiscographyShelf({
    entries,
    sort,
    onSortChange,
    trackCount,
    locale,
    onAlbumClick,
    onTrackClick,
    cardWidth,
}: Props) {
    const resolvedLocale = resolveLocale(locale);
    const resolvedCardWidth = cardWidth ?? 220;
    const ordered = useMemo(() => {
        const next = [...entries];
        next.sort((a, b) => {
            const aTime = parseReleaseDate(a.album);
            const bTime = parseReleaseDate(b.album);
            const diff = (aTime || 0) - (bTime || 0);
            return sort === 'newest' ? -diff : diff;
        });
        return next;
    }, [entries, sort]);
    const { scrollRef, fade } = useScrollFade('horizontal', [ordered.length]);

    const renderTimelineMarkers = () =>
        ordered.map((entry) => {
            const releaseLabel = formatIsoDate(
                entry.album.release_date,
                { month: 'short', year: 'numeric' },
                resolvedLocale
            );
            return (
                <Flex
                    key={`marker-${entry.album.id ?? entry.album.name}`}
                    direction="column"
                    align="center"
                    className="flex-none"
                    style={{ width: resolvedCardWidth }}
                >
                    <span className="relative z-[1] h-2 w-2 rounded-full bg-[var(--accent-9)]" />
                    <Text
                        size="1"
                        color="gray"
                        className="mt-2 tracking-[0.2em] uppercase"
                    >
                        {releaseLabel || '—'}
                    </Text>
                </Flex>
            );
        });

    return (
        <Flex direction="column" gap="2">
            <Flex align="center" justify="between" gap="2">
                <Text size="3" weight="bold">
                    Discography
                </Text>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Button size="1" variant="ghost" color="gray">
                            <Flex align="center">
                                <Text size="1" color="gray">
                                    {sort === 'newest' ? 'Newest' : 'Oldest'}
                                </Text>
                                <CaretSortIcon />
                            </Flex>
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content size="1" align="end">
                        <DropdownMenu.Item
                            onSelect={() => onSortChange('newest')}
                        >
                            Newest
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            onSelect={() => onSortChange('oldest')}
                        >
                            Oldest
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </Flex>

            <Flex direction="column" className="relative">
                <Flex
                    ref={scrollRef}
                    className="no-overflow-anchor scrollbar-gutter-stable overflow-x-scroll overflow-y-hidden"
                >
                    <Flex direction="column" className="min-w-max">
                        <Flex className="relative mb-2 min-w-max gap-2">
                            <div className="pointer-events-none absolute top-[4px] right-2 left-2 h-px bg-[var(--gray-a4)]" />
                            {renderTimelineMarkers()}
                        </Flex>
                        <Flex gap="2" className="min-w-max">
                            {ordered.map((entry) => (
                                <DiscographyAlbumCard
                                    key={entry.album.id ?? entry.album.name}
                                    entry={entry}
                                    trackCount={trackCount}
                                    cardWidth={resolvedCardWidth}
                                    onAlbumClick={onAlbumClick}
                                    onTrackClick={onTrackClick}
                                />
                            ))}
                        </Flex>
                    </Flex>
                </Flex>
                <div
                    className={clsx(
                        'pointer-events-none absolute top-0 left-0 z-10 h-full w-2 bg-gradient-to-r from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
                        fade.start ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
                <div
                    className={clsx(
                        'pointer-events-none absolute top-0 right-0 z-10 h-full w-2 bg-gradient-to-l from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
                        fade.end ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
            </Flex>
        </Flex>
    );
}
