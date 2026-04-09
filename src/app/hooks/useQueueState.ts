import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Episode, Track } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../shared/logging';
import { trackOrEpisodeToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';
import type { MediaShelfItem } from '../types/mediaShelf';
import {
    MEDIA_CACHE_KEYS,
    type NowPlayingCacheEntry,
} from './mediaCacheEntries';
import {
    updateMediaCacheEntry,
    useMediaCacheEntry,
} from './useMediaCache';

const logger = createLogger('queue');

export const DEFAULT_QUEUE_POLL_MS = 5000;

export type QueueEntry = MediaShelfItem & {
    queueKey: string;
    queueSignature: string;
};

export type QueueState = {
    current: MediaItem | null;
    queue: QueueEntry[];
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

    if (left.uri || right.uri || left.id || right.id) return false;

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
        const mapped = trackOrEpisodeToItem(item, locale);
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
) => {
    if (!current || queue.length === 0) return queue;

    if (!isSameQueueItem(queue[0], current)) return queue;
    return queue.slice(1);
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

const sameQueueOrder = (left: QueueEntry[], right: QueueEntry[]) =>
    left.length === right.length &&
    left.every((item, index) => item.queueKey === right[index]?.queueKey);

const isDocumentVisible = () =>
    typeof document === 'undefined' || document.visibilityState === 'visible';

export function useQueueState(
    locale: string,
    pollMs = DEFAULT_QUEUE_POLL_MS
) {
    const cachedQueueState = useMediaCacheEntry<QueueState>(
        MEDIA_CACHE_KEYS.queueView
    );
    const cachedNowPlaying = useMediaCacheEntry<NowPlayingCacheEntry>(
        MEDIA_CACHE_KEYS.nowPlaying
    );
    const cachedNowPlayingItem = useMemo(
        () =>
            cachedNowPlaying?.item
                ? trackOrEpisodeToItem(cachedNowPlaying.item, locale)
                : null,
        [cachedNowPlaying?.item, locale]
    );
    const [queueState, setQueueState] = useState<QueueState | null>(
        () => cachedQueueState ?? null
    );
    const [loading, setLoading] = useState(() => cachedQueueState == null);
    const [syncing, setSyncing] = useState(false);

    const mountedRef = useRef(false);
    const queueStateRef = useRef<QueueState | null>(queueState);
    const refreshSeqRef = useRef(0);
    const refreshPromiseRef = useRef<Promise<void> | null>(null);
    const refreshQueuedRef = useRef(false);
    const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncingRef = useRef(false);
    const refreshRef = useRef<() => Promise<void>>(async () => undefined);

    const clearPollTimeout = useCallback(() => {
        if (!pollTimeoutRef.current) return;

        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
    }, []);

    const commitQueueState = useCallback((nextState: QueueState) => {
        const previous = queueStateRef.current;
        const resolved = previous
            ? mergeQueueState(previous, nextState)
            : nextState;

        queueStateRef.current = resolved;

        if (mountedRef.current) {
            setQueueState((current) => (current === resolved ? current : resolved));
        }

        updateMediaCacheEntry(MEDIA_CACHE_KEYS.queueView, resolved, {
            signature: queueStateSignature(resolved),
        });

        return resolved;
    }, []);

    const loadQueue = useCallback(async () => {
        const data = await sendSpotifyMessage('getQueue');
        const currentItem = data.currently_playing
            ? trackOrEpisodeToItem(data.currently_playing, locale)
            : cachedNowPlayingItem;
        const queueItems = mapQueueEntries(
            data.queue as Array<Track | Episode> | undefined,
            locale
        );

        return {
            current: currentItem,
            queue: normalizeUpcomingQueue(queueItems, currentItem),
        } satisfies QueueState;
    }, [cachedNowPlayingItem, locale]);

    const schedulePoll = useCallback(() => {
        clearPollTimeout();

        if (pollMs <= 0 || syncingRef.current || !isDocumentVisible()) return;

        pollTimeoutRef.current = setTimeout(() => {
            pollTimeoutRef.current = null;
            void refreshRef.current();
        }, pollMs);
    }, [clearPollTimeout, pollMs]);

    const refresh = useCallback(async () => {
        if (syncingRef.current) return;

        clearPollTimeout();

        if (refreshPromiseRef.current) {
            refreshQueuedRef.current = true;
            return refreshPromiseRef.current;
        }

        const requestId = ++refreshSeqRef.current;
        const shouldShowLoading = queueStateRef.current == null;

        if (shouldShowLoading && mountedRef.current) {
            setLoading(true);
        }

        const promise = loadQueue()
            .then((nextState) => {
                if (!mountedRef.current) return;
                if (requestId !== refreshSeqRef.current) return;

                commitQueueState(nextState);
            })
            .catch((error) => {
                if (!mountedRef.current) return;
                logError(logger, 'Failed to load queue', error);
            })
            .finally(() => {
                if (refreshPromiseRef.current === promise) {
                    refreshPromiseRef.current = null;
                }

                if (!mountedRef.current) return;

                setLoading(false);

                if (refreshQueuedRef.current) {
                    refreshQueuedRef.current = false;
                    void refreshRef.current();
                    return;
                }

                schedulePoll();
            });

        refreshPromiseRef.current = promise;
        return promise;
    }, [clearPollTimeout, commitQueueState, loadQueue, schedulePoll]);

    refreshRef.current = refresh;

    const syncQueueToSpotify = useCallback(
        async (nextQueue: QueueEntry[]) => {
            if (syncingRef.current) return;

            syncingRef.current = true;

            // Ignore any in-flight load that resolves after this optimistic mutation.
            refreshSeqRef.current += 1;
            refreshQueuedRef.current = false;
            clearPollTimeout();

            if (mountedRef.current) {
                setSyncing(true);
            }

            const nextState = {
                current: queueStateRef.current?.current ?? cachedNowPlayingItem,
                queue: nextQueue,
            } satisfies QueueState;

            commitQueueState(nextState);

            try {
                await sendSpotifyMessage('syncQueue', {
                    upcomingUris: nextQueue
                        .map((item) => item.uri)
                        .filter((uri): uri is string => Boolean(uri)),
                    currentUri: nextState.current?.uri ?? undefined,
                });
            } catch (error) {
                logError(logger, 'Failed to sync queue order', error);
            } finally {
                syncingRef.current = false;

                if (mountedRef.current) {
                    setSyncing(false);
                }

                await refreshRef.current();
            }
        },
        [cachedNowPlayingItem, clearPollTimeout, commitQueueState]
    );

    const reorderQueue = useCallback(
        (items: QueueEntry[]) => {
            const currentQueue = queueStateRef.current?.queue ?? [];

            if (sameQueueOrder(currentQueue, items)) return;
            void syncQueueToSpotify(items);
        },
        [syncQueueToSpotify]
    );

    const removeFromQueue = useCallback(
        (queueKey: string) => {
            if (syncingRef.current) return;

            const currentQueue = queueStateRef.current?.queue ?? [];
            const nextQueue = currentQueue.filter(
                (item) => item.queueKey !== queueKey
            );

            if (nextQueue.length === currentQueue.length) return;

            void syncQueueToSpotify(nextQueue);
        },
        [syncQueueToSpotify]
    );

    const clearQueue = useCallback(() => {
        if (syncingRef.current) return;
        void syncQueueToSpotify([]);
    }, [syncQueueToSpotify]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            clearPollTimeout();
            refreshQueuedRef.current = false;
        };
    }, [clearPollTimeout]);

    useEffect(() => {
        queueStateRef.current = queueState;
    }, [queueState]);

    useEffect(() => {
        if (!cachedQueueState || queueStateRef.current) return;
        commitQueueState(cachedQueueState);
        setLoading(false);
    }, [cachedQueueState, commitQueueState]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        const handleFocus = () => {
            if (!isDocumentVisible()) return;
            void refreshRef.current();
        };

        const handleVisibilityChange = () => {
            if (!isDocumentVisible()) {
                clearPollTimeout();
                return;
            }

            void refreshRef.current();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
        };
    }, [clearPollTimeout]);

    const upcoming = queueState?.queue ?? [];
    const nowPlaying = queueState?.current ?? cachedNowPlayingItem;

    return {
        loading,
        syncing,
        nowPlaying,
        upcoming,
        clearQueue,
        reorderQueue,
        removeFromQueue,
    };
}
