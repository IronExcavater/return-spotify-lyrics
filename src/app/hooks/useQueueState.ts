import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Episode, Track } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../shared/logging';
import { trackOrEpisodeToItem, trackToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';
import type { MediaShelfItem } from '../types/mediaShelf';
import {
    MEDIA_CACHE_KEYS,
    type NowPlayingCacheEntry,
} from './mediaCacheEntries';
import { updateMediaCacheEntry, useMediaCacheEntry } from './useMediaCache';

const logger = createLogger('queue');

export const DEFAULT_QUEUE_POLL_MS = 5000;
const RECENTLY_PLAYED_REFRESH_MS = 30_000;

export type QueueEditUnavailableReason = 'spotify-queue-read-only';

export type QueueEntry = MediaShelfItem & {
    queueKey: string;
    queueSignature: string;
};

export type QueueViewState = {
    current: MediaItem | null;
    queue: QueueEntry[];
    recentlyPlayed: MediaShelfItem[];
    editUnavailableReason: QueueEditUnavailableReason;
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

const dedupeRecentlyPlayed = (items: MediaShelfItem[]) => {
    const seen = new Set<string>();

    return items.filter((item) => {
        const key = item.uri ?? item.id;
        if (!key) return true;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
};

const mapQueueEntries = (queue: MediaItem[]): QueueEntry[] => {
    const occurrences = new Map<string, number>();

    return queue.map((item) => {
        const signature = queueSignature(item);
        const nextOccurrence = (occurrences.get(signature) ?? 0) + 1;

        occurrences.set(signature, nextOccurrence);

        const queueKey = `${signature}#${nextOccurrence}`;

        return {
            ...item,
            queueSignature: signature,
            listKey: queueKey,
            queueKey,
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

const mergeQueueEntries = (previous: QueueEntry[], next: QueueEntry[]) => {
    const previousByKey = new Map(
        previous.map((item) => [item.queueKey, item])
    );

    return next.map((item) => previousByKey.get(item.queueKey) ?? item);
};

const mergeMediaItems = (
    previous: MediaShelfItem[],
    next: MediaShelfItem[]
) => {
    const previousByKey = new Map(
        previous.map((item) => [item.listKey ?? item.uri ?? item.id, item])
    );

    return next.map((item) => {
        const key = item.listKey ?? item.uri ?? item.id;
        if (!key) return item;
        return previousByKey.get(key) ?? item;
    });
};

const mergeQueueState = (
    previous: QueueViewState,
    next: QueueViewState
): QueueViewState => {
    const nextCurrent =
        mediaIdentity(previous.current) === mediaIdentity(next.current)
            ? previous.current
            : next.current;
    const mergedQueue = mergeQueueEntries(previous.queue, next.queue);
    const mergedRecentlyPlayed = mergeMediaItems(
        previous.recentlyPlayed,
        next.recentlyPlayed
    );

    const queueUnchanged =
        previous.queue.length === mergedQueue.length &&
        previous.queue.every((item, index) => item === mergedQueue[index]);
    const recentlyPlayedUnchanged =
        previous.recentlyPlayed.length === mergedRecentlyPlayed.length &&
        previous.recentlyPlayed.every(
            (item, index) => item === mergedRecentlyPlayed[index]
        );

    if (
        previous.current === nextCurrent &&
        queueUnchanged &&
        recentlyPlayedUnchanged &&
        previous.editUnavailableReason === next.editUnavailableReason
    ) {
        return previous;
    }

    return {
        current: nextCurrent,
        queue: mergedQueue,
        recentlyPlayed: mergedRecentlyPlayed,
        editUnavailableReason: next.editUnavailableReason,
    };
};

const queueStateSignature = (state: QueueViewState) =>
    [
        mediaIdentity(state.current),
        state.editUnavailableReason,
        ...state.queue.map((item) => item.queueKey),
        ...state.recentlyPlayed.map(
            (item) => item.listKey ?? item.uri ?? item.id
        ),
    ].join('||');

const isDocumentVisible = () =>
    typeof document === 'undefined' || document.visibilityState === 'visible';

const shouldRefreshRecentlyPlayed = (lastRefreshedAt: number) =>
    Date.now() - lastRefreshedAt >= RECENTLY_PLAYED_REFRESH_MS;

export function useQueueState(locale: string, pollMs = DEFAULT_QUEUE_POLL_MS) {
    const cachedQueueState = useMediaCacheEntry<QueueViewState>(
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
    const [queueState, setQueueState] = useState<QueueViewState | null>(
        () => cachedQueueState ?? null
    );
    const [loading, setLoading] = useState(() => cachedQueueState == null);
    const [recentlyPlayedLoading, setRecentlyPlayedLoading] = useState(
        () => cachedQueueState == null
    );

    const mountedRef = useRef(false);
    const queueStateRef = useRef<QueueViewState | null>(queueState);
    const refreshSeqRef = useRef(0);
    const refreshPromiseRef = useRef<Promise<void> | null>(null);
    const refreshQueuedRef = useRef(false);
    const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshRef = useRef<() => Promise<void>>(async () => undefined);
    const lastRecentlyPlayedRefreshRef = useRef(0);

    const clearPollTimeout = useCallback(() => {
        if (!pollTimeoutRef.current) return;

        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
    }, []);

    const commitQueueState = useCallback((nextState: QueueViewState) => {
        const previous = queueStateRef.current;
        const resolved = previous
            ? mergeQueueState(previous, nextState)
            : nextState;

        queueStateRef.current = resolved;

        if (mountedRef.current) {
            setQueueState((current) =>
                current === resolved ? current : resolved
            );
        }

        updateMediaCacheEntry(MEDIA_CACHE_KEYS.queueView, resolved, {
            signature: queueStateSignature(resolved),
        });
    }, []);

    const loadQueueSnapshot = useCallback(async () => {
        const data = await sendSpotifyMessage('getQueue');
        const currentItem = data.currently_playing
            ? trackOrEpisodeToItem(data.currently_playing, locale)
            : cachedNowPlayingItem;
        const queueItems = mapQueueEntries(
            ((data.queue as Array<Track | Episode> | undefined) ?? []).map(
                (item) => trackOrEpisodeToItem(item, locale)
            )
        );

        return {
            current: currentItem,
            queue: normalizeUpcomingQueue(queueItems, currentItem),
        };
    }, [cachedNowPlayingItem, locale]);

    const loadRecentlyPlayedSnapshot = useCallback(async () => {
        const data = await sendSpotifyMessage('getRecentlyPlayedTracks', {
            limit: 20,
        });

        return dedupeRecentlyPlayed(
            ((data.items as Array<{ track: Track }> | undefined) ?? []).map(
                (entry, index) => ({
                    ...trackToItem(entry.track),
                    listKey:
                        entry.track.uri ??
                        entry.track.id ??
                        `recently-played-${index}`,
                })
            )
        );
    }, []);

    const schedulePoll = useCallback(() => {
        clearPollTimeout();

        if (pollMs <= 0 || !isDocumentVisible()) return;

        pollTimeoutRef.current = setTimeout(() => {
            pollTimeoutRef.current = null;
            void refreshRef.current();
        }, pollMs);
    }, [clearPollTimeout, pollMs]);

    const refresh = useCallback(async () => {
        clearPollTimeout();

        if (refreshPromiseRef.current) {
            refreshQueuedRef.current = true;
            return refreshPromiseRef.current;
        }

        const requestId = ++refreshSeqRef.current;
        const shouldShowQueueLoading = queueStateRef.current == null;
        const shouldRefreshRecent =
            queueStateRef.current == null ||
            shouldRefreshRecentlyPlayed(lastRecentlyPlayedRefreshRef.current);

        if (shouldShowQueueLoading && mountedRef.current) {
            setLoading(true);
        }

        if (shouldRefreshRecent && mountedRef.current) {
            setRecentlyPlayedLoading(true);
        }

        const promise = Promise.all([
            loadQueueSnapshot(),
            shouldRefreshRecent
                ? loadRecentlyPlayedSnapshot()
                : Promise.resolve(queueStateRef.current?.recentlyPlayed ?? []),
        ])
            .then(([queueSnapshot, recentlyPlayed]) => {
                if (!mountedRef.current) return;
                if (requestId !== refreshSeqRef.current) return;

                if (shouldRefreshRecent) {
                    lastRecentlyPlayedRefreshRef.current = Date.now();
                }

                commitQueueState({
                    ...queueSnapshot,
                    recentlyPlayed,
                    editUnavailableReason: 'spotify-queue-read-only',
                });
            })
            .catch((error) => {
                if (!mountedRef.current) return;
                logError(logger, 'Failed to load queue view', error);
            })
            .finally(() => {
                if (refreshPromiseRef.current === promise) {
                    refreshPromiseRef.current = null;
                }

                if (!mountedRef.current) return;

                setLoading(false);
                setRecentlyPlayedLoading(false);

                if (refreshQueuedRef.current) {
                    refreshQueuedRef.current = false;
                    void refreshRef.current();
                    return;
                }

                schedulePoll();
            });

        refreshPromiseRef.current = promise;
        return promise;
    }, [
        clearPollTimeout,
        commitQueueState,
        loadQueueSnapshot,
        loadRecentlyPlayedSnapshot,
        schedulePoll,
    ]);

    refreshRef.current = refresh;

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
        queueStateRef.current = cachedQueueState;
        setQueueState(cachedQueueState);
        setLoading(false);
        setRecentlyPlayedLoading(false);
    }, [cachedQueueState]);

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

    return {
        loading,
        recentlyPlayedLoading,
        nowPlaying: queueState?.current ?? cachedNowPlayingItem,
        upcoming: queueState?.queue ?? [],
        recentlyPlayed: queueState?.recentlyPlayed ?? [],
        editUnavailableReason: queueState?.editUnavailableReason,
    };
}
