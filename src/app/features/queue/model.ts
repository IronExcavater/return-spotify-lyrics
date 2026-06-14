import type { Episode, Track } from '@spotify/web-api-ts-sdk';

import { trackOrEpisodeToItem, trackToItem } from '../../../shared/media';
import type { MediaItem } from '../../../shared/types';
import type { MediaShelfItem } from '../../types/mediaShelf';

export const DEFAULT_QUEUE_POLL_MS = 5000;
const RECENTLY_PLAYED_REFRESH_MS = 30_000;

export type QueueEntry = MediaShelfItem & {
    queueKey: string;
    queueSignature: string;
};

export type QueueViewState = {
    current: MediaItem | null;
    queue: QueueEntry[];
    recentlyPlayed: MediaShelfItem[];
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
    `${mediaIdentity(item)}|${item.imageUrl ?? ''}`;

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

function dedupeRecentlyPlayed(items: MediaShelfItem[]) {
    const seen = new Set<string>();

    return items.filter((item) => {
        const key = item.uri ?? item.id;
        if (!key) return true;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

export function mapQueueEntries(
    queue: Array<Track | Episode> | undefined,
    locale: string
): QueueEntry[] {
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
            listKey: queueKey,
            queueKey,
        };
    });
}

export function mapRecentlyPlayedEntries(
    entries: Array<{ track: Track }> | undefined
) {
    return dedupeRecentlyPlayed(
        (entries ?? []).map((entry, index) => ({
            ...trackToItem(entry.track),
            listKey:
                entry.track.uri ?? entry.track.id ?? `recently-played-${index}`,
        }))
    );
}

export function normalizeUpcomingQueue(
    queue: QueueEntry[],
    current: MediaItem | null
) {
    if (!current || queue.length === 0) return queue;

    if (!isSameQueueItem(queue[0], current)) return queue;
    return queue.slice(1);
}

function mergeByKey<T>(
    previous: T[],
    next: T[],
    getKey: (item: T) => string | undefined
) {
    const previousByKey = new Map(previous.map((item) => [getKey(item), item]));

    return next.map((item) => {
        const key = getKey(item);
        if (!key) return item;
        return previousByKey.get(key) ?? item;
    });
}

const mergeQueueEntries = (previous: QueueEntry[], next: QueueEntry[]) =>
    mergeByKey(previous, next, (item) => item.queueKey);

const mergeMediaItems = (previous: MediaShelfItem[], next: MediaShelfItem[]) =>
    mergeByKey(previous, next, (item) => item.listKey ?? item.uri ?? item.id);

export function mergeQueueState(
    previous: QueueViewState,
    next: QueueViewState
): QueueViewState {
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
        recentlyPlayedUnchanged
    ) {
        return previous;
    }

    return {
        current: nextCurrent,
        queue: mergedQueue,
        recentlyPlayed: mergedRecentlyPlayed,
    };
}

export const queueStateSignature = (state: QueueViewState) =>
    [
        mediaIdentity(state.current),
        ...state.queue.map((item) => item.queueKey),
        ...state.recentlyPlayed.map(
            (item) => item.listKey ?? item.uri ?? item.id
        ),
    ].join('||');

export const sameQueueOrder = (left: QueueEntry[], right: QueueEntry[]) =>
    left.length === right.length &&
    left.every((item, index) => item.queueKey === right[index]?.queueKey);

export const isDocumentVisible = () =>
    typeof document === 'undefined' || document.visibilityState === 'visible';

export const shouldRefreshRecentlyPlayed = (lastRefreshedAt: number) =>
    Date.now() - lastRefreshedAt >= RECENTLY_PLAYED_REFRESH_MS;
