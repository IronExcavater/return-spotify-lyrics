import type {
    Episode,
    Playlist,
    PlaylistedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';

import { trackOrEpisodeToItem } from '../../../../shared/media';
import type { MediaItem } from '../../../../shared/types';
import type { PlaylistDedupableItem } from '../duplicates';
import { isFresh } from './cache';
import {
    PLAYLIST_CONTENT_CACHE_LIMIT,
    PLAYLIST_CONTENT_FRESH_MS,
    PLAYLIST_CONTENT_USABLE_MS,
    PLAYLIST_PAGE_SIZE,
    type PlaylistContentCacheEntry,
    type PlaylistContentChunkCacheEntry,
    type PlaylistContentState,
    type PlaylistWithNullablePublic,
} from './model';

function createPlaylistItemKey(entry: PlaylistedTrack, index: number) {
    const base =
        entry.track?.uri ?? entry.track?.id ?? entry.track?.name ?? 'track';
    const added = entry.added_at ?? 'unknown';
    return `${base}:${added}:${index}`;
}

export function normalizePlaylist(
    playlist: Playlist<Track>
): PlaylistWithNullablePublic {
    return {
        ...playlist,
        public:
            typeof playlist.public === 'boolean' || playlist.public === null
                ? playlist.public
                : null,
    };
}

export function mapPlaylistContentItems(
    entries: Array<PlaylistedTrack> = [],
    locale: string,
    offset: number
): PlaylistDedupableItem[] {
    const safeEntries = Array.isArray(entries) ? entries : [];
    return safeEntries.map((entry, index) => {
        const track = entry.track;
        const item: MediaItem | null = track
            ? trackOrEpisodeToItem(track as Track | Episode, locale)
            : null;
        if (!item) {
            return {
                id: `missing-${offset + index}`,
                title: 'Unavailable',
                subtitle: 'Track removed',
                listKey: `missing-${offset + index}`,
                kind: 'track' as const,
                playlistIndex: offset + index,
                addedAt: entry.added_at ?? undefined,
            };
        }
        return {
            ...item,
            listKey: createPlaylistItemKey(entry, offset + index),
            playlistIndex: offset + index,
            playlistTrackId:
                track && track.type === 'track'
                    ? (track as Track).id
                    : undefined,
            playlistTrackUri: track?.uri ?? undefined,
            addedAt: entry.added_at ?? undefined,
            durationMs:
                'duration_ms' in (track ?? {}) &&
                typeof track?.duration_ms === 'number'
                    ? track.duration_ms
                    : undefined,
        };
    });
}

export function getPlaylistTrackIds(items: PlaylistDedupableItem[]) {
    return items
        .map((item) => item.playlistTrackId)
        .filter((trackId): trackId is string => Boolean(trackId));
}

function sumItemDurations(items: PlaylistDedupableItem[]) {
    return items.reduce((total, item) => total + (item.durationMs ?? 0), 0);
}

export function buildPlaylistContentChunks(
    items: PlaylistDedupableItem[],
    updatedAt: number
) {
    let cumulativeDurationMs = 0;
    const chunksByOffset: Record<string, PlaylistContentChunkCacheEntry> = {};

    for (let offset = 0; offset < items.length; offset += PLAYLIST_PAGE_SIZE) {
        const chunkItems = items.slice(offset, offset + PLAYLIST_PAGE_SIZE);
        cumulativeDurationMs += sumItemDurations(chunkItems);
        chunksByOffset[offset] = {
            offset,
            items: chunkItems,
            trackIds: getPlaylistTrackIds(chunkItems),
            cumulativeDurationMs,
            updatedAt,
        };
    }

    return chunksByOffset;
}

export function prunePlaylistContentEntries(
    entriesById: Record<string, PlaylistContentCacheEntry>
) {
    const trimmedEntries = Object.values(entriesById)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, PLAYLIST_CONTENT_CACHE_LIMIT);

    return Object.fromEntries(
        trimmedEntries.map((entry) => [entry.playlistId, entry])
    );
}

export function resolvePlaylistContentStateFromEntry(
    entry?: PlaylistContentCacheEntry
): {
    state: PlaylistContentState | null;
    chunksFresh: boolean;
    chunksUsable: boolean;
} {
    if (!entry?.playlist) {
        return { state: null, chunksFresh: false, chunksUsable: false };
    }

    const items: PlaylistDedupableItem[] = [];
    let totalDurationMs = 0;
    let chunksFresh = true;
    let chunksUsable = true;
    let offset = 0;

    while (true) {
        const chunk = entry.chunksByOffset[offset];
        if (!chunk) break;
        items.push(...chunk.items);
        totalDurationMs = chunk.cumulativeDurationMs;
        chunksFresh &&= isFresh(chunk.updatedAt, PLAYLIST_CONTENT_FRESH_MS);
        chunksUsable &&= isFresh(chunk.updatedAt, PLAYLIST_CONTENT_USABLE_MS);
        offset += chunk.items.length;
        if (chunk.items.length < PLAYLIST_PAGE_SIZE) break;
    }

    return {
        state: {
            playlist: entry.playlist,
            items,
            totalDurationMs,
            itemsOffset: items.length,
            itemsHasMore: items.length < entry.total,
            itemsLoadingMore: false,
            snapshotId: entry.snapshotId,
            fetchedAt: entry.fetchedAt,
        },
        chunksFresh,
        chunksUsable,
    };
}
