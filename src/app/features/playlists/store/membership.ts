import type { TrackPlaylistTarget } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    getTrackPlaylistIndexEntry,
    isUsableTrackPlaylistIndex,
    resolveCachedCatalog,
    resolveTrackPlaylistCache,
} from './cache';
import { patchTrackPlaylistCatalogEntry } from './catalog';
import {
    LIKED_PLAYLIST_ID,
    LIKED_STALE_MS,
    PARTIAL_MEMBERSHIP_USABLE_MS,
    type LikedMembershipCache,
    type PlaylistCatalogEntry,
    type PlaylistTrackIndexCacheEntry,
    type TrackPlaylistCache,
    type TrackPlaylistsResult,
} from './model';
import { mergeTrackIds, storeTrackPlaylistLoadedItems } from './trackIndex';

const likedCache: LikedMembershipCache = {
    userId: undefined,
    liked: {},
};
const likedPromises = new Map<string, Promise<boolean>>();

function resolveCachedPlaylistMembership({
    playlist,
    trackId,
    cache,
}: {
    playlist: PlaylistCatalogEntry;
    trackId: string;
    cache: TrackPlaylistCache;
}) {
    const entry = getTrackPlaylistIndexEntry(cache, playlist.id);
    if (
        !isUsableTrackPlaylistIndex({
            entry,
            snapshotId: playlist.snapshotId,
            maxAgeMs: PARTIAL_MEMBERSHIP_USABLE_MS,
        })
    ) {
        return null;
    }
    if (!entry) return null;
    if (entry.trackIds.includes(trackId)) return true;
    if (entry.loadedCount >= entry.total) return false;
    return null;
}

function syncLikedCacheOwner(userId?: string) {
    if (userId === likedCache.userId) return;

    likedCache.userId = userId;
    likedCache.liked = {};
    likedPromises.clear();
}

function isLikedFresh(trackId: string) {
    const liked = likedCache.liked[trackId];
    return Boolean(liked && Date.now() - liked.updatedAt < LIKED_STALE_MS);
}

export async function loadTrackPlaylists(
    target: TrackPlaylistTarget
): Promise<TrackPlaylistsResult> {
    const { userId, cache } = await resolveTrackPlaylistCache();
    syncLikedCacheOwner(userId);
    const cachedCatalog = resolveCachedCatalog(cache, userId);

    const liked = isLikedFresh(target.trackId)
        ? likedCache.liked[target.trackId].saved
        : null;
    const membership: Record<string, boolean | null> = {
        [LIKED_PLAYLIST_ID]: liked,
    };
    const loadingById: Record<string, boolean> = {
        [LIKED_PLAYLIST_ID]: liked == null,
    };

    cachedCatalog.playlists.forEach((playlist) => {
        const cachedMembership = resolveCachedPlaylistMembership({
            playlist,
            trackId: target.trackId,
            cache,
        });
        membership[playlist.id] = cachedMembership;
        loadingById[playlist.id] = cachedMembership == null;
    });

    return {
        userId,
        catalog: cachedCatalog.playlists,
        membership,
        loadingById,
        needsLikedRefresh: liked == null,
    };
}

export async function ensureTrackLikedMembership({
    trackId,
    userId,
}: {
    trackId: string;
    userId?: string;
}) {
    syncLikedCacheOwner(userId);

    if (isLikedFresh(trackId)) {
        return likedCache.liked[trackId].saved;
    }

    const existingPromise = likedPromises.get(trackId);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
        const result = await sendSpotifyMessage('hasSavedTracks', [trackId]);
        const saved = Boolean(result[0]);

        likedCache.liked[trackId] = {
            saved,
            updatedAt: Date.now(),
        };

        return saved;
    })().finally(() => {
        likedPromises.delete(trackId);
    });

    likedPromises.set(trackId, promise);
    return promise;
}

function toResolvedTrackPlaylistIndex(entry: PlaylistTrackIndexCacheEntry) {
    return {
        playlistId: entry.playlistId,
        snapshotId: entry.snapshotId,
        total: entry.total,
        trackIds: entry.trackIds,
        updatedAt: entry.updatedAt,
    };
}

export async function ensureTrackPlaylistIndex({
    playlist,
    userId,
    trackId,
}: {
    playlist: PlaylistCatalogEntry;
    userId?: string;
    trackId?: string;
}) {
    const { cache } = await resolveTrackPlaylistCache(userId);
    const cachedMembership = getTrackPlaylistIndexEntry(cache, playlist.id);
    if (
        isUsableTrackPlaylistIndex({
            entry: cachedMembership,
            snapshotId: playlist.snapshotId,
            maxAgeMs: PARTIAL_MEMBERSHIP_USABLE_MS,
        }) &&
        cachedMembership
    ) {
        const fullyLoaded =
            cachedMembership.loadedCount >= cachedMembership.total;
        const trackIsKnown =
            trackId != null && cachedMembership.trackIds.includes(trackId);
        if (fullyLoaded || trackIsKnown) {
            return toResolvedTrackPlaylistIndex(cachedMembership);
        }
    }

    const index = await sendSpotifyMessage('getPlaylistTrackIndex', {
        id: playlist.id,
        snapshotId: playlist.snapshotId,
    });
    await storeTrackPlaylistLoadedItems({
        playlistId: index.playlistId,
        snapshotId: index.snapshotId,
        total: index.total,
        loadedCount: index.total,
        trackIds: index.trackIds,
        userId,
    });

    return {
        playlistId: index.playlistId,
        snapshotId: index.snapshotId,
        total: index.total,
        trackIds: index.trackIds,
        updatedAt: Date.now(),
    };
}

export async function toggleTrackPlaylistMembership({
    playlistId,
    playlist,
    trackId,
    trackUri,
    shouldSave,
    userId,
}: {
    playlistId: string;
    playlist?: PlaylistCatalogEntry;
    trackId: string;
    trackUri: string;
    shouldSave: boolean;
    userId?: string;
}) {
    if (playlistId === LIKED_PLAYLIST_ID) {
        syncLikedCacheOwner(userId);

        if (shouldSave) await sendSpotifyMessage('saveTracks', [trackId]);
        else await sendSpotifyMessage('unsaveTracks', [trackId]);

        likedCache.liked[trackId] = {
            saved: shouldSave,
            updatedAt: Date.now(),
        };
        return;
    }

    if (!playlist) {
        throw new Error('Playlist not found');
    }

    const { cache } = await resolveTrackPlaylistCache(userId);
    const existing = getTrackPlaylistIndexEntry(cache, playlistId);

    if (shouldSave) {
        const result = await sendSpotifyMessage('addTracksToPlaylist', {
            playlistId,
            uris: [trackUri],
        });
        const nextTotal = playlist.total + 1;
        await patchTrackPlaylistCatalogEntry({
            playlistId,
            snapshotId: result.snapshot_id,
            total: nextTotal,
            userId,
        });
        await storeTrackPlaylistLoadedItems({
            playlistId,
            snapshotId: result.snapshot_id,
            total: nextTotal,
            loadedCount: Math.max(1, (existing?.loadedCount ?? 0) + 1),
            trackIds: mergeTrackIds(existing?.trackIds ?? [], [trackId]),
            userId,
        });
        return;
    }

    const result = await sendSpotifyMessage('removeTracksFromPlaylist', {
        playlistId,
        uris: [trackUri],
        snapshotId: playlist.snapshotId,
    });
    const nextTotal = Math.max(0, playlist.total - 1);
    await patchTrackPlaylistCatalogEntry({
        playlistId,
        snapshotId: result.snapshot_id,
        total: nextTotal,
        userId,
    });
    await storeTrackPlaylistLoadedItems({
        playlistId,
        snapshotId: result.snapshot_id,
        total: nextTotal,
        loadedCount: Math.max(0, (existing?.loadedCount ?? 0) - 1),
        trackIds: (existing?.trackIds ?? []).filter(
            (cachedTrackId) => cachedTrackId !== trackId
        ),
        userId,
    });
}
