import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, Text, Tooltip } from '@radix-ui/themes';
import type { SimplifiedAlbum, SimplifiedTrack } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { formatIsoDate } from '../../shared/date';
import { resolveLocale } from '../../shared/locale';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { useScrollFade } from '../hooks/useScrollFade';
import { useShelfNavigation } from '../hooks/useShelfNavigation';
import { MediaAlbum, type MediaAlbumEntry } from './MediaAlbum';

export type DiscographyEntry = MediaAlbumEntry;

type SortOrder = 'newest' | 'oldest';

type Props = {
    entries: DiscographyEntry[];
    sort: SortOrder;
    onSortChange: (next: SortOrder) => void;
    trackCount: number;
    locale?: string;
    onAlbumClick: (album: SimplifiedAlbum) => void;
    onTrackClick: (track: SimplifiedTrack, album: SimplifiedAlbum) => void;
    loading?: boolean;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
};

const parseReleaseDate = (album: SimplifiedAlbum) => {
    const raw = album.release_date;
    if (!raw) return Number.NaN;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    return Number.NaN;
};

const isPlaceholderEntry = (entry: DiscographyEntry, label: string) =>
    entry.album.name === label && !entry.album.uri;

export function DiscographyShelf({
    entries,
    sort,
    onSortChange,
    trackCount,
    locale,
    onAlbumClick,
    onTrackClick,
    loading = false,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
}: Props) {
    const resolvedLocale = resolveLocale(locale);
    const resolvedCardWidth = 220;
    const skeletonLabel = '\u00A0';
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
    const buildPlaceholderEntries = (count: number, prefix: string) =>
        Array.from({ length: count }, (_, index) => ({
            album: {
                id: `${prefix}-${index}`,
                name: skeletonLabel,
                album_type: 'album',
                total_tracks: 1,
                images: [],
                artists: [],
                available_markets: [],
                release_date: '',
                release_date_precision: 'day',
                type: 'album',
                uri: '',
                href: '',
                external_urls: { spotify: '' },
            } as SimplifiedAlbum,
            tracks: [
                {
                    id: `${prefix}-track-${index}`,
                    name: skeletonLabel,
                    duration_ms: 0,
                    artists: [],
                    available_markets: [],
                    disc_number: 1,
                    track_number: 1,
                    explicit: false,
                    type: 'track',
                    uri: '',
                    href: '',
                    preview_url: null,
                    is_local: false,
                    external_urls: { spotify: '' },
                } as SimplifiedTrack,
            ],
        }));
    const placeholderEntries = useMemo(() => {
        if (!loading || ordered.length > 0) return [];
        return buildPlaceholderEntries(5, 'loading');
    }, [loading, ordered.length, skeletonLabel]);
    const loadingMoreEntries = useMemo(() => {
        if (!loadingMore || placeholderEntries.length > 0) return [];
        return buildPlaceholderEntries(3, 'loading-more');
    }, [loadingMore, placeholderEntries.length, skeletonLabel]);
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
    const [itemWidths, setItemWidths] = useState<number[]>([]);

    useLayoutEffect(() => {
        const nodes = displayEntries.map(
            (_, index) => focusRefs.current[index]
        );
        if (nodes.length === 0) return;

        const measure = () => {
            const next = nodes.map(
                (node) => node?.getBoundingClientRect().width ?? 0
            );
            setItemWidths((prev) => {
                if (
                    prev.length === next.length &&
                    prev.every((value, idx) => value === next[idx])
                )
                    return prev;
                return next;
            });
        };

        measure();
        const observer = new ResizeObserver(() => measure());
        nodes.forEach((node) => {
            if (node) observer.observe(node);
        });
        return () => observer.disconnect();
    }, [displayEntries, focusRefs]);

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
    const renderTimelineMarkers = () =>
        displayEntries.map((entry, index) => {
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
            const markerWidth =
                itemWidths[index] || resolvedCardWidth || undefined;
            return (
                <Flex
                    key={`marker-${entry.album.id ?? entry.album.name}`}
                    direction="column"
                    align="center"
                    className="flex-none"
                    style={{ width: markerWidth || undefined }}
                >
                    <span className="bg-accent-9 relative z-1 h-2 w-2 rounded-full" />
                    {fullDate ? (
                        <Tooltip content={fullDate}>
                            <Text
                                size="1"
                                color="gray"
                                className="mt-2 tracking-[0.2em] uppercase"
                            >
                                {releaseLabel || '—'}
                            </Text>
                        </Tooltip>
                    ) : (
                        <Text
                            size="1"
                            color="gray"
                            className="mt-2 tracking-[0.2em] uppercase"
                        >
                            {releaseLabel || '—'}
                        </Text>
                    )}
                </Flex>
            );
        });

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
                className="py-1 pr-1"
            >
                <Text size="3" weight="bold">
                    Discography
                </Text>
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
                    className="no-overflow-anchor overflow-x-scroll overflow-y-hidden p-1 pt-0"
                    onFocusCapture={handleContainerFocusCapture}
                    onKeyDownCapture={handleContainerKeyDown}
                >
                    <Flex direction="column" className="min-w-max">
                        <Flex className="relative min-w-max" mb="2" gap="2">
                            <div className="bg-grayA-4 pointer-events-none absolute top-1 right-2 left-2 h-px" />
                            {renderTimelineMarkers()}
                        </Flex>
                        <Flex gap="2" className="min-w-max">
                            {displayEntries.map((entry, index) => {
                                const key = entry.album.id ?? entry.album.name;
                                const entryLoading = isPlaceholderEntry(
                                    entry,
                                    skeletonLabel
                                );
                                const canActivate =
                                    Boolean(entry.album.id) && !entryLoading;
                                return (
                                    <div
                                        key={key}
                                        ref={(node) => {
                                            focusRefs.current[index] = node;
                                        }}
                                        data-index={index}
                                        role="button"
                                        tabIndex={
                                            index === activeIndex ? 0 : -1
                                        }
                                        aria-disabled={!canActivate}
                                        className="rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background shrink-0 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                                        style={
                                            entry.tracks.length > 1
                                                ? { width: resolvedCardWidth }
                                                : undefined
                                        }
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
                                );
                            })}
                            <div
                                ref={sentinelRef}
                                aria-hidden
                                className="h-full w-px shrink-0"
                            />
                        </Flex>
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
