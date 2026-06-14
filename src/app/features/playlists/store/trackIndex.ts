import { getTrackPlaylistIndexEntry, updateTrackPlaylistCache } from './cache';
import { getPlaylistTrackIds } from './contentItems';
import type {
    PlaylistContentState,
    PlaylistTrackIndexCacheEntry,
} from './model';

export const mergeTrackIds = (...values: string[][]) =>
    Array.from(new Set(values.flat()));

export function createTrackPlaylistIndexEntry({
    playlistId,
    snapshotId,
    total,
    loadedCount,
    trackIds,
    updatedAt,
}: {
    playlistId: string;
    snapshotId: string;
    total: number;
    loadedCount: number;
    trackIds: string[];
    updatedAt: number;
}): PlaylistTrackIndexCacheEntry {
    return {
        playlistId,
        snapshotId,
        total,
        loadedCount: Math.min(total, Math.max(0, loadedCount)),
        trackIds: Array.from(new Set(trackIds)),
        updatedAt,
    };
}

export function buildTrackPlaylistIndexFromState(
    state: Omit<PlaylistContentState, 'fetchedAt'>,
    snapshotId: string,
    total: number,
    updatedAt: number
) {
    return createTrackPlaylistIndexEntry({
        playlistId: state.playlist.id,
        snapshotId,
        total,
        loadedCount: state.itemsOffset,
        trackIds: getPlaylistTrackIds(state.items),
        updatedAt,
    });
}

export async function storeTrackPlaylistLoadedItems({
    playlistId,
    snapshotId,
    total,
    loadedCount,
    trackIds,
    userId,
}: {
    playlistId: string;
    snapshotId: string;
    total: number;
    loadedCount: number;
    trackIds: string[];
    userId?: string;
}) {
    await updateTrackPlaylistCache(userId, (cache, now) => {
        const existing = getTrackPlaylistIndexEntry(cache, playlistId);
        const mergedTrackIds =
            existing?.snapshotId === snapshotId
                ? mergeTrackIds(existing.trackIds, trackIds)
                : trackIds;

        return {
            ...cache,
            userId: userId ?? cache.userId,
            membershipsByPlaylistId: {
                ...cache.membershipsByPlaylistId,
                [playlistId]: createTrackPlaylistIndexEntry({
                    playlistId,
                    snapshotId,
                    total,
                    loadedCount: Math.max(
                        existing?.snapshotId === snapshotId
                            ? existing.loadedCount
                            : 0,
                        loadedCount
                    ),
                    trackIds: mergedTrackIds,
                    updatedAt: now,
                }),
            },
        };
    });
}
