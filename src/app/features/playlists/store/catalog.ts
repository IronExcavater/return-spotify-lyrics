import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    resolveCachedCatalog,
    resolveTrackPlaylistCache,
    updateTrackPlaylistCache,
} from './cache';
import {
    type PlaylistCatalogEntry,
    type PlaylistEntrySource,
    type TrackPlaylistCache,
} from './model';

export function toPlaylistEntry(
    playlist: PlaylistEntrySource,
    currentUserId?: string
): PlaylistCatalogEntry {
    return {
        id: playlist.id,
        name: playlist.name,
        imageUrl: playlist.images?.[0]?.url,
        ownerName: playlist.owner?.display_name ?? undefined,
        snapshotId: playlist.snapshot_id,
        total: playlist.tracks?.total ?? 0,
        editable:
            playlist.collaborative || playlist.owner?.id === currentUserId,
    };
}

export function upsertPlaylistCatalogEntry(
    playlists: PlaylistCatalogEntry[],
    nextEntry: PlaylistCatalogEntry
) {
    const nextPlaylists = [...playlists];
    const index = nextPlaylists.findIndex((item) => item.id === nextEntry.id);
    if (index >= 0) nextPlaylists[index] = nextEntry;
    else nextPlaylists.unshift(nextEntry);
    return nextPlaylists;
}

export function withCatalogCache({
    cache,
    playlists,
    userId,
    fetchedAt,
    complete,
}: {
    cache: TrackPlaylistCache;
    playlists: PlaylistCatalogEntry[];
    userId?: string;
    fetchedAt: number;
    complete: boolean;
}): TrackPlaylistCache {
    return {
        ...cache,
        userId: userId ?? cache.userId,
        catalog: {
            userId,
            fetchedAt,
            complete,
            playlists,
        },
    };
}

export async function upsertTrackPlaylistCatalog({
    playlists,
    userId,
    complete,
}: {
    playlists: PlaylistCatalogEntry[];
    userId?: string;
    complete: boolean;
}) {
    await updateTrackPlaylistCache(userId, (cache, now) =>
        withCatalogCache({
            cache,
            playlists,
            userId,
            fetchedAt: now,
            complete,
        })
    );
}

export async function patchTrackPlaylistCatalogEntry({
    playlistId,
    snapshotId,
    total,
    userId,
}: {
    playlistId: string;
    snapshotId: string;
    total: number;
    userId?: string;
}) {
    const { userId: resolvedUserId, cache } =
        await resolveTrackPlaylistCache(userId);
    const current = resolveCachedCatalog(cache, resolvedUserId).playlists;
    const index = current.findIndex((item) => item.id === playlistId);
    if (index < 0) return;

    const nextPlaylists = [...current];
    nextPlaylists[index] = {
        ...nextPlaylists[index],
        snapshotId,
        total,
    };

    await upsertTrackPlaylistCatalog({
        playlists: nextPlaylists,
        userId: resolvedUserId,
        complete: cache.catalog?.complete ?? false,
    });
}

export async function primeTrackPlaylistCatalogCache(userId?: string) {
    try {
        await loadTrackPlaylistCatalog(userId);
    } catch {
        // Keep stale cache if the background refresh fails.
    }
}

export async function markTrackPlaylistCatalogStale() {
    await updateTrackPlaylistCache(undefined, (cache) => ({
        ...cache,
        catalog: cache.catalog
            ? {
                  ...cache.catalog,
                  fetchedAt: 0,
              }
            : undefined,
    }));
}

export async function removeTrackPlaylistFromCache(playlistId: string) {
    await updateTrackPlaylistCache(undefined, (cache) => {
        const contentsByPlaylistId = { ...cache.contentsByPlaylistId };
        const membershipsByPlaylistId = { ...cache.membershipsByPlaylistId };
        delete contentsByPlaylistId[playlistId];
        delete membershipsByPlaylistId[playlistId];

        return {
            ...cache,
            catalog: cache.catalog
                ? {
                      ...cache.catalog,
                      fetchedAt: 0,
                      playlists: cache.catalog.playlists.filter(
                          (playlist) => playlist.id !== playlistId
                      ),
                  }
                : undefined,
            membershipsByPlaylistId,
            contentsByPlaylistId,
        };
    });
}

export async function loadTrackPlaylistCatalog(userId?: string) {
    const { userId: resolvedUserId, cache } =
        await resolveTrackPlaylistCache(userId);
    const cachedCatalog = resolveCachedCatalog(cache, resolvedUserId);
    if (cachedCatalog.complete && cachedCatalog.fresh) {
        return cachedCatalog.playlists;
    }

    const playlists = await sendSpotifyMessage('getUserPlaylists', {
        limit: 50,
        offset: 0,
    });
    const nextPlaylists = playlists.items.map((playlist) =>
        toPlaylistEntry(playlist, resolvedUserId)
    );
    await upsertTrackPlaylistCatalog({
        playlists: nextPlaylists,
        userId: resolvedUserId,
        complete: true,
    });
    return nextPlaylists;
}
