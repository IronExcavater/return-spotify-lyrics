import { useEffect, useMemo, useRef } from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import {
    Button,
    DropdownMenu,
    Flex,
    Switch,
    Text,
    Tooltip,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { formatIsoDate } from '../../../shared/date';
import { resolveLocale } from '../../../shared/locale';
import type {
    AlbumTrackGroup,
    AlbumMediaSource,
    TrackMediaSource,
} from '../../../shared/media';
import { handleMenuTriggerKeyDown } from '../../hooks/useActions';
import { useScrollFade } from '../../hooks/useScrollFade';
import { useShelfNavigation } from '../../hooks/useShelfNavigation';
import { MediaAlbum } from './MediaAlbum';

export type DiscographyEntry = AlbumTrackGroup;

type SortOrder = 'newest' | 'oldest';
const SKELETON_LABEL = '\u00A0';

type Props = {
    entries: DiscographyEntry[];
    sort: SortOrder;
    onSortChange: (next: SortOrder) => void;
    trackCount: number;
    locale?: string;
    onAlbumClick: (album: AlbumMediaSource) => void;
    onTrackClick: (track: TrackMediaSource, album: AlbumMediaSource) => void;
    showAppearances?: boolean;
    onShowAppearancesChange?: (next: boolean) => void;
    loading?: boolean;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
};

const parseReleaseDate = (album: AlbumMediaSource) => {
    const raw = album.release_date;
    if (!raw) return Number.NaN;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    return Number.NaN;
};

const isPlaceholderEntry = (entry: DiscographyEntry, label: string) =>
    entry.album.name === label && !entry.album.uri;

const hasFixedShelfItemWidth = ({
    loading,
    trackCount,
}: {
    loading: boolean;
    trackCount: number;
}) => loading || trackCount > 1;

const createPlaceholderAlbum = (
    id: string,
    label: string
): AlbumMediaSource => ({
    album_group: 'album',
    album_type: 'album',
    artists: [],
    external_urls: { spotify: '' },
    id,
    images: [],
    name: label,
    release_date: '',
    total_tracks: 1,
    uri: '',
});

const createPlaceholderTrack = (
    id: string,
    label: string
): TrackMediaSource => ({
    artists: [],
    duration_ms: 0,
    external_urls: { spotify: '' },
    id,
    name: label,
    uri: '',
});

const buildPlaceholderEntries = (
    count: number,
    prefix: string
): DiscographyEntry[] =>
    Array.from({ length: count }, (_, index) => ({
        album: createPlaceholderAlbum(`${prefix}-${index}`, SKELETON_LABEL),
        tracks: [
            createPlaceholderTrack(`${prefix}-track-${index}`, SKELETON_LABEL),
        ],
    }));

export function DiscographyShelf({
    entries,
    sort,
    onSortChange,
    trackCount,
    locale,
    onAlbumClick,
    onTrackClick,
    showAppearances = false,
    onShowAppearancesChange,
    loading = false,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
}: Props) {
    const resolvedLocale = resolveLocale(locale);
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
    const placeholderEntries = useMemo(() => {
        if (!loading || ordered.length > 0) return [];
        return buildPlaceholderEntries(5, 'loading');
    }, [loading, ordered.length]);
    const loadingMoreEntries = useMemo(() => {
        if (!loadingMore || placeholderEntries.length > 0) return [];
        return buildPlaceholderEntries(3, 'loading-more');
    }, [loadingMore, placeholderEntries.length]);
    const displayEntries =
        placeholderEntries.length > 0
            ? placeholderEntries
            : [...ordered, ...loadingMoreEntries];
    const { scrollRef, fade } = useScrollFade('horizontal', [
        displayEntries.length,
    ]);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const {
        focusRefs,
        activeIndex,
        handleItemFocus,
        handleItemKeyDown,
        handleContainerFocusCapture,
        handleContainerKeyDown,
    } = useShelfNavigation({
        containerRef: scrollRef,
        itemCount: displayEntries.length,
        orientation: 'horizontal',
        itemsPerColumn: 1,
        interactive: true,
    });

    useEffect(() => {
        const root = scrollRef.current;
        const target = sentinelRef.current;
        if (!root || !target || !onLoadMore || !hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (loadingMore || !hasMore) return;
                if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
            },
            {
                root,
                rootMargin: '0px 240px 0px 0px',
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore]);
    const renderTimelineMarker = (entry: DiscographyEntry) => {
        const releaseLabel = formatIsoDate(
            entry.album.release_date,
            { month: 'short', year: 'numeric' },
            resolvedLocale
        );
        const fullDate = formatIsoDate(
            entry.album.release_date,
            { dateStyle: 'long' },
            resolvedLocale
        );
        const label = (
            <Text
                size="1"
                color="gray"
                className="mt-2 tracking-[0.2em] uppercase"
            >
                {releaseLabel || '—'}
            </Text>
        );

        return (
            <Flex direction="column" align="center" mb="2" className="w-full">
                <span className="bg-accent-9 relative z-1 h-2 w-2 rounded-full" />
                {fullDate ? (
                    <Tooltip content={fullDate}>{label}</Tooltip>
                ) : (
                    label
                )}
            </Flex>
        );
    };

    const focusActiveShelfItem = () => {
        const fallback = focusRefs.current.find((node) => Boolean(node));
        const target = focusRefs.current[activeIndex] ?? fallback;
        target?.focus();
    };
    return (
        <Flex direction="column" gap="2">
            <Flex
                align="center"
                justify="between"
                gap="2"
                className="flex-wrap py-1 pr-1"
            >
                <Text size="3" weight="bold">
                    Discography
                </Text>
                <Flex align="center" gap="2" ml="auto" className="flex-wrap">
                    {onShowAppearancesChange && (
                        <Flex align="center" gap="1" className="shrink-0">
                            <Text size="1" color="gray">
                                Appearances
                            </Text>
                            <Switch
                                size="1"
                                checked={showAppearances}
                                aria-label="Show appearances in discography"
                                onCheckedChange={onShowAppearancesChange}
                            />
                        </Flex>
                    )}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                            onKeyDown={(event) => {
                                handleMenuTriggerKeyDown(event);
                                if (event.key !== 'ArrowDown') return;
                                event.preventDefault();
                                requestAnimationFrame(() => {
                                    focusActiveShelfItem();
                                });
                            }}
                        >
                            <Button size="0" variant="ghost" color="gray">
                                <Flex align="center">
                                    <Text size="1" color="gray">
                                        {sort === 'newest'
                                            ? 'Newest'
                                            : 'Oldest'}
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
            </Flex>
            <Flex direction="column" className="relative">
                <Flex
                    ref={scrollRef}
                    className="no-overflow-anchor overflow-x-scroll overflow-y-hidden p-1 pt-0"
                    onFocusCapture={handleContainerFocusCapture}
                    onKeyDownCapture={handleContainerKeyDown}
                >
                    <Flex className="relative min-w-max" gap="2">
                        <div className="bg-grayA-4 pointer-events-none absolute top-1 right-2 left-2 h-px" />
                        {displayEntries.map((entry, index) => {
                            const key = entry.album.id ?? entry.album.name;
                            const entryLoading = isPlaceholderEntry(
                                entry,
                                SKELETON_LABEL
                            );
                            const canActivate =
                                Boolean(entry.album.id) && !entryLoading;
                            const fixedItemWidth = hasFixedShelfItemWidth({
                                loading: loading || entryLoading,
                                trackCount: entry.tracks.length,
                            });
                            return (
                                <Flex
                                    key={key}
                                    direction="column"
                                    className={clsx(
                                        'flex-none',
                                        fixedItemWidth && 'w-55'
                                    )}
                                >
                                    {renderTimelineMarker(entry)}
                                    <div
                                        ref={(node) => {
                                            focusRefs.current[index] = node;
                                        }}
                                        data-index={index}
                                        role={
                                            canActivate ? 'button' : undefined
                                        }
                                        tabIndex={
                                            canActivate && index === activeIndex
                                                ? 0
                                                : -1
                                        }
                                        aria-label={
                                            canActivate
                                                ? `Open ${entry.album.name}`
                                                : undefined
                                        }
                                        title={
                                            canActivate
                                                ? entry.album.name
                                                : undefined
                                        }
                                        className={clsx(
                                            'rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background shrink-0 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
                                            fixedItemWidth && 'w-55'
                                        )}
                                        onFocus={(event) =>
                                            handleItemFocus(event, index)
                                        }
                                        onKeyDown={(event) =>
                                            handleItemKeyDown(
                                                event,
                                                index,
                                                canActivate,
                                                () => onAlbumClick(entry.album)
                                            )
                                        }
                                    >
                                        <MediaAlbum
                                            entry={entry}
                                            trackCount={trackCount}
                                            onAlbumClick={onAlbumClick}
                                            onTrackClick={onTrackClick}
                                            loading={loading || entryLoading}
                                        />
                                    </div>
                                </Flex>
                            );
                        })}
                        <div
                            ref={sentinelRef}
                            aria-hidden
                            className="h-full w-px shrink-0"
                        />
                    </Flex>
                </Flex>
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute top-0 left-0 z-10 h-full w-2 bg-linear-to-r to-transparent transition-opacity',
                        fade.start ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute top-0 right-0 z-10 h-full w-2 bg-linear-to-l to-transparent transition-opacity',
                        fade.end ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
            </Flex>
        </Flex>
    );
}
