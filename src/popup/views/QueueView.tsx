import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flex, Switch, Text } from '@radix-ui/themes';
import type { Episode, Track } from '@spotify/web-api-ts-sdk';

import { resolveLocale } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import { episodeToItem, trackToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaActionGroup, MediaItem } from '../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf, type MediaShelfItem } from '../components/MediaShelf';
import { StickyLayout } from '../components/StickyLayout';
import {
    MEDIA_CACHE_KEYS,
    type NowPlayingCacheEntry,
} from '../hooks/mediaCacheEntries';
import { useLazyPolling } from '../hooks/useLazyPolling';
import { buildMediaActions } from '../hooks/useMediaActions';
import {
    updateMediaCacheEntry,
    useMediaCacheEntry,
} from '../hooks/useMediaCache';
import { useSettings } from '../hooks/useSettings';

const logger = createLogger('queue');
const POLL_MS = 5000;

type QueueEntry = MediaShelfItem & {
    queueKey: string;
    queueSignature: string;
};

type QueueState = {
    current: MediaItem | null;
    queue: QueueEntry[];
};

const isEpisodeItem = (item: Track | Episode): item is Episode =>
    item.type === 'episode' || 'show' in item;

const mapQueueItem = (item: Track | Episode, locale: string): MediaItem => {
    if (isEpisodeItem(item)) {
        return episodeToItem(item, locale, item.show);
    }
    return trackToItem(item);
};

const mediaIdentity = (item: MediaItem | null) =>
    item
        ? [
              item.kind ?? '',
              item.uri ?? '',
              item.id ?? '',
              item.title ?? '',
              item.subtitle ?? '',
          ].join('|')
        : '';

const queueSignature = (item: MediaItem) =>
    [
        item.kind ?? '',
        item.uri ?? '',
        item.id ?? '',
        item.title ?? '',
        item.subtitle ?? '',
        item.imageUrl ?? '',
    ].join('|');

const normalizeLabel = (value?: string) => value?.trim().toLowerCase() ?? '';

const isSameQueueItem = (left: MediaItem, right: MediaItem) => {
    if (left.uri && right.uri && left.uri === right.uri) return true;
    if (
        left.id &&
        right.id &&
        left.id === right.id &&
        left.kind === right.kind
    ) {
        return true;
    }

    return (
        left.kind === right.kind &&
        normalizeLabel(left.title) === normalizeLabel(right.title) &&
        normalizeLabel(left.subtitle) === normalizeLabel(right.subtitle)
    );
};

const mapQueueEntries = (
    queue: Array<Track | Episode> | undefined,
    locale: string
): QueueEntry[] => {
    const occurrences = new Map<string, number>();
    return (queue ?? []).map((item) => {
        const mapped = mapQueueItem(item, locale);
        const signature = queueSignature(mapped);
        const nextOccurrence = (occurrences.get(signature) ?? 0) + 1;
        occurrences.set(signature, nextOccurrence);
        const queueKey = `${signature}#${nextOccurrence}`;
        return {
            ...mapped,
            queueSignature: signature,
            queueKey,
            listKey: queueKey,
        };
    });
};

const normalizeUpcomingQueue = (
    queue: QueueEntry[],
    current: MediaItem | null
): QueueEntry[] => {
    if (!current || queue.length === 0) return queue;
    let leadingCurrentCount = 0;
    while (
        leadingCurrentCount < queue.length &&
        isSameQueueItem(queue[leadingCurrentCount], current)
    ) {
        leadingCurrentCount += 1;
    }

    if (leadingCurrentCount === 0) return queue;
    if (leadingCurrentCount === queue.length) return [];
    return queue.slice(leadingCurrentCount);
};

const mergeQueueState = (prev: QueueState, next: QueueState): QueueState => {
    const nextCurrent =
        mediaIdentity(prev.current) === mediaIdentity(next.current)
            ? prev.current
            : next.current;

    const previousByKey = new Map(
        prev.queue.map((item) => [item.queueKey, item])
    );
    const mergedQueue = next.queue.map(
        (item) => previousByKey.get(item.queueKey) ?? item
    );

    const queueUnchanged =
        prev.queue.length === mergedQueue.length &&
        prev.queue.every((item, index) => item === mergedQueue[index]);

    if (prev.current === nextCurrent && queueUnchanged) return prev;
    return { current: nextCurrent, queue: mergedQueue };
};

const queueStateSignature = (state: QueueState) =>
    [
        mediaIdentity(state.current),
        ...state.queue.map((item) => item.queueKey),
    ].join('||');

export function QueueView() {
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const cachedQueueState = useMediaCacheEntry<QueueState>(
        MEDIA_CACHE_KEYS.queueView
    );
    const cachedNowPlaying = useMediaCacheEntry<NowPlayingCacheEntry>(
        MEDIA_CACHE_KEYS.nowPlaying
    );
    const [reorderMode, setReorderMode] = useState(false);
    const [syncingQueue, setSyncingQueue] = useState(false);
    const syncingQueueRef = useRef(false);
    const queueStateRef = useRef<QueueState | null>(null);
    const skeletonLabel = '\u00A0';
    const cachedNowPlayingItem = useMemo(
        () =>
            cachedNowPlaying?.item
                ? mapQueueItem(cachedNowPlaying.item, locale)
                : null,
        [cachedNowPlaying?.item, locale]
    );

    const loadQueue = useCallback(async () => {
        const data = await sendSpotifyMessage('getQueue');
        const currentItem = data.currently_playing
            ? mapQueueItem(data.currently_playing, locale)
            : cachedNowPlayingItem
              ? cachedNowPlayingItem
              : null;
        const queueItems = mapQueueEntries(
            data.queue as Array<Track | Episode> | undefined,
            locale
        );
        const normalizedQueue = normalizeUpcomingQueue(queueItems, currentItem);
        return {
            current: currentItem,
            queue: normalizedQueue,
        } satisfies QueueState;
    }, [cachedNowPlayingItem, locale]);

    const {
        data: queueState,
        loading,
        refresh,
        setData,
    } = useLazyPolling<QueueState>({
        load: loadQueue,
        enabled: !reorderMode && !syncingQueue,
        intervalMs: POLL_MS,
        initialData: cachedQueueState,
        merge: mergeQueueState,
        onError: (error) => logError(logger, 'Failed to load queue', error),
    });

    useEffect(() => {
        queueStateRef.current = queueState;
    }, [queueState]);

    useEffect(() => {
        if (!queueState) return;
        updateMediaCacheEntry(MEDIA_CACHE_KEYS.queueView, queueState, {
            signature: queueStateSignature(queueState),
        });
    }, [queueState]);

    const skeletonRows = useMemo(
        () =>
            Array.from({ length: 6 }, (_, index) => ({
                id: `skeleton-${index}`,
                title: skeletonLabel,
                subtitle: skeletonLabel,
            })),
        [skeletonLabel]
    );
    const nowPlayingSkeletonRows = useMemo(
        () => [
            {
                id: 'skeleton-now-playing',
                title: skeletonLabel,
                subtitle: skeletonLabel,
            },
        ],
        [skeletonLabel]
    );

    const upcoming = queueState?.queue ?? [];
    const nowPlaying = queueState?.current ?? cachedNowPlayingItem;
    const nowPlayingLoading = loading && !nowPlaying;
    const upcomingLoading = loading && upcoming.length === 0;

    const syncQueueToSpotify = useCallback(
        async (nextQueue: QueueEntry[]) => {
            if (syncingQueueRef.current) return;
            syncingQueueRef.current = true;
            setSyncingQueue(true);

            try {
                const currentUri = queueStateRef.current?.current?.uri ?? null;
                const upcomingUris = nextQueue
                    .map((item) => item.uri)
                    .filter((uri): uri is string => Boolean(uri));
                await sendSpotifyMessage('syncQueue', {
                    upcomingUris,
                    currentUri: currentUri ?? undefined,
                });
                await refresh();
            } catch (error) {
                logError(logger, 'Failed to sync queue order', error);
                await refresh();
            } finally {
                syncingQueueRef.current = false;
                setSyncingQueue(false);
            }
        },
        [refresh]
    );

    const handleRemoveFromQueue = useCallback(
        (queueKey: string) => {
            if (syncingQueueRef.current) return;
            const currentQueue = queueStateRef.current?.queue ?? [];
            const nextQueue = currentQueue.filter(
                (item) => item.queueKey !== queueKey
            );
            if (nextQueue.length === currentQueue.length) return;

            setData((prev) => (prev ? { ...prev, queue: nextQueue } : prev));
            void syncQueueToSpotify(nextQueue);
        },
        [setData, syncQueueToSpotify]
    );

    const getQueueItemActions = useCallback(
        (item: MediaShelfItem): MediaActionGroup => {
            const queueItem = item as QueueEntry;
            const base = buildMediaActions(queueItem);
            const primary = base.primary.filter(
                (action) => action.id !== 'add-queue'
            );
            primary.push({
                id: 'remove-queue',
                label: 'Remove from queue',
                shortcut: '⌫',
                onSelect: () => {
                    handleRemoveFromQueue(queueItem.queueKey);
                },
            });
            return { primary, secondary: base.secondary };
        },
        [handleRemoveFromQueue]
    );

    const getNowPlayingActions = useCallback((item: MediaShelfItem) => {
        const base = buildMediaActions(item);
        return {
            primary: base.primary.filter(
                (action) =>
                    action.id !== 'play-now' &&
                    action.id !== 'add-queue' &&
                    action.id !== 'remove-queue'
            ),
            secondary: base.secondary,
        } satisfies MediaActionGroup;
    }, []);

    const handleReorder = useCallback(
        (items: MediaShelfItem[]) => {
            if (syncingQueueRef.current) return;
            const nextQueue = items as QueueEntry[];
            setData((prev) => (prev ? { ...prev, queue: nextQueue } : prev));
            void syncQueueToSpotify(nextQueue);
        },
        [setData, syncQueueToSpotify]
    );

    const reorderEnabled =
        reorderMode && !upcomingLoading && !syncingQueue && upcoming.length > 1;
    const queueHeaderRight = (
        <Flex align="center" gap="2">
            <Text size="1" color="gray">
                Reorder
            </Text>
            <Switch
                size="1"
                checked={reorderMode}
                disabled={
                    upcomingLoading || syncingQueue || upcoming.length < 2
                }
                onCheckedChange={setReorderMode}
                aria-label="Toggle queue reorder mode"
            />
        </Flex>
    );

    return (
        <StickyLayout.Root className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <StickyLayout.Body>
                <Flex
                    pl="3"
                    pr="1"
                    pt="2"
                    pb="1"
                    direction="column"
                    gap="3"
                    className="min-w-0"
                >
                    <MediaSection
                        editing={false}
                        loading={nowPlayingLoading}
                        stickyHeader={false}
                        section={
                            {
                                id: 'queue-now-playing',
                                title: 'Now playing',
                                view: 'list',
                                infinite: 'rows',
                                rows: 0,
                                items: nowPlayingLoading
                                    ? nowPlayingSkeletonRows
                                    : nowPlaying
                                      ? [nowPlaying]
                                      : [],
                            } satisfies MediaSectionState
                        }
                        onChange={() => undefined}
                        renderContent={({ loading: sectionLoading }) => {
                            if (!sectionLoading && !nowPlaying) {
                                return (
                                    <Text size="2" color="gray">
                                        Nothing is playing right now.
                                    </Text>
                                );
                            }
                            return (
                                <MediaShelf
                                    items={
                                        sectionLoading
                                            ? nowPlayingSkeletonRows
                                            : nowPlaying
                                              ? [nowPlaying]
                                              : []
                                    }
                                    variant="list"
                                    orientation="vertical"
                                    itemsPerColumn={1}
                                    interactive={!sectionLoading}
                                    itemLoading={sectionLoading}
                                    getActions={getNowPlayingActions}
                                />
                            );
                        }}
                    />

                    <MediaSection
                        editing={false}
                        loading={upcomingLoading}
                        headerRight={queueHeaderRight}
                        section={
                            {
                                id: 'queue-up-next',
                                title: 'Up next',
                                view: 'list',
                                infinite: 'rows',
                                rows: 0,
                                items: upcomingLoading
                                    ? skeletonRows
                                    : upcoming,
                            } satisfies MediaSectionState
                        }
                        onChange={() => undefined}
                        renderContent={({ loading: sectionLoading }) => {
                            if (!sectionLoading && upcoming.length === 0) {
                                return (
                                    <Text size="2" color="gray">
                                        Queue is empty.
                                    </Text>
                                );
                            }
                            return (
                                <MediaShelf
                                    items={
                                        sectionLoading ? skeletonRows : upcoming
                                    }
                                    variant="list"
                                    orientation="vertical"
                                    itemsPerColumn={6}
                                    draggable={reorderEnabled}
                                    interactive={!sectionLoading}
                                    itemLoading={sectionLoading}
                                    onReorder={
                                        reorderEnabled
                                            ? handleReorder
                                            : undefined
                                    }
                                    getActions={getQueueItemActions}
                                />
                            );
                        }}
                    />
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
