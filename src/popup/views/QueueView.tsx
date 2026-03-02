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
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import { useLazyPolling } from '../hooks/useLazyPolling';
import { buildMediaActions } from '../hooks/useMediaActions';
import { usePlayer } from '../hooks/usePlayer';
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

export function QueueView() {
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const { playback } = usePlayer();
    const [reorderMode, setReorderMode] = useState(false);
    const [syncingQueue, setSyncingQueue] = useState(false);
    const syncingQueueRef = useRef(false);
    const queueStateRef = useRef<QueueState | null>(null);
    const skeletonLabel = '\u00A0';

    const loadQueue = useCallback(async () => {
        const data = await sendSpotifyMessage('getQueue');
        const currentItem = data.currently_playing
            ? mapQueueItem(data.currently_playing, locale)
            : playback?.item
              ? mapQueueItem(playback.item as Track | Episode, locale)
              : null;
        const queueItems = mapQueueEntries(
            data.queue as Array<Track | Episode> | undefined,
            locale
        );
        return {
            current: currentItem,
            queue: queueItems,
        } satisfies QueueState;
    }, [locale, playback?.item]);

    const {
        data: queueState,
        loading,
        refresh,
        setData,
    } = useLazyPolling<QueueState>({
        load: loadQueue,
        intervalMs: POLL_MS,
        merge: mergeQueueState,
        onError: (error) => logError(logger, 'Failed to load queue', error),
    });

    useEffect(() => {
        queueStateRef.current = queueState;
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

    const upcoming = queueState?.queue ?? [];

    const syncQueueToSpotify = useCallback(
        async (nextQueue: QueueEntry[]) => {
            if (syncingQueueRef.current) return;
            syncingQueueRef.current = true;
            setSyncingQueue(true);

            try {
                const playbackState =
                    await sendSpotifyMessage('getPlaybackState');
                const currentUri =
                    queueStateRef.current?.current?.uri ??
                    playbackState?.item?.uri ??
                    null;
                const upcomingUris = nextQueue
                    .map((item) => item.uri)
                    .filter((uri): uri is string => Boolean(uri));
                const uris = currentUri
                    ? [currentUri, ...upcomingUris]
                    : upcomingUris;

                if (uris.length === 0) {
                    await refresh();
                    return;
                }

                await sendSpotifyMessage('startPlayback', {
                    uris,
                    positionMs: currentUri
                        ? (playbackState?.progress_ms ?? undefined)
                        : undefined,
                });

                if (playbackState?.is_playing === false) {
                    await sendSpotifyMessage('pausePlayback');
                }

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

    if (!queueState && loading) {
        return (
            <Flex p="3" direction="column" gap="2">
                <SkeletonText
                    loading
                    parts={[skeletonLabel]}
                    preset="media-row"
                    variant="title"
                >
                    <Text size="5" weight="bold">
                        {skeletonLabel}
                    </Text>
                </SkeletonText>
                <SkeletonText
                    loading
                    parts={[skeletonLabel]}
                    preset="media-row"
                    variant="subtitle"
                >
                    <Text size="2" color="gray">
                        {skeletonLabel}
                    </Text>
                </SkeletonText>
            </Flex>
        );
    }

    const nowPlaying = queueState?.current;
    const reorderEnabled =
        reorderMode && !loading && !syncingQueue && upcoming.length > 1;
    const queueHeaderRight = (
        <Flex align="center" gap="2">
            <Text size="1" color="gray">
                Reorder
            </Text>
            <Switch
                size="1"
                checked={reorderMode}
                disabled={loading || syncingQueue || upcoming.length < 2}
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
                    pb="3"
                    direction="column"
                    gap="3"
                    className="min-w-0"
                >
                    <Flex direction="column" gap="2" pt="2">
                        <Text size="3" weight="bold">
                            Now playing
                        </Text>
                        {nowPlaying ? (
                            <MediaShelf
                                items={[nowPlaying]}
                                variant="list"
                                orientation="vertical"
                                itemsPerColumn={1}
                                interactive={!loading}
                                itemLoading={loading}
                                getActions={getNowPlayingActions}
                            />
                        ) : (
                            <Text size="2" color="gray">
                                Nothing is playing right now.
                            </Text>
                        )}
                    </Flex>

                    <MediaSection
                        editing={false}
                        loading={loading}
                        headerRight={queueHeaderRight}
                        section={
                            {
                                id: 'queue-up-next',
                                title: 'Up next',
                                view: 'list',
                                infinite: 'rows',
                                rows: 0,
                                items: loading ? skeletonRows : upcoming,
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
