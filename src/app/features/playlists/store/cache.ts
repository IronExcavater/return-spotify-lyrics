import { getFromStorage, setInStorage } from '../../../../shared/storage';
import type { SpotifyConnectionMeta } from '../../../hooks/useAuth';
import {
    CATALOG_FRESH_MS,
    CATALOG_USABLE_MS,
    SPOTIFY_CONNECTION_KEY,
    TRACK_PLAYLIST_CACHE_KEY,
    type PlaylistCatalogEntry,
    type PlaylistTrackIndexCacheEntry,
    type TrackPlaylistCache,
} from './model';

let trackPlaylistCache: TrackPlaylistCache | null = null;

function createEmptyTrackPlaylistCache(userId?: string): TrackPlaylistCache {
    return {
        userId,
        membershipsByPlaylistId: {},
        contentsByPlaylistId: {},
    };
}

export function isFresh(updatedAt: number | undefined, maxAgeMs: number) {
    return Boolean(updatedAt && Date.now() - updatedAt < maxAgeMs);
}

function hydrateTrackPlaylistCache(
    value: Partial<TrackPlaylistCache> | undefined,
    userId?: string
): TrackPlaylistCache {
    const hydrated: TrackPlaylistCache = {
        userId: value?.userId,
        catalog: value?.catalog,
        membershipsByPlaylistId: value?.membershipsByPlaylistId ?? {},
        contentsByPlaylistId: value?.contentsByPlaylistId ?? {},
    };

    if (hydrated.userId && userId && hydrated.userId !== userId) {
        return createEmptyTrackPlaylistCache(userId);
    }

    if (!hydrated.userId && userId) {
        return { ...hydrated, userId };
    }

    return hydrated;
}

async function getCurrentUserId() {
    const connection = await getFromStorage<SpotifyConnectionMeta>(
        SPOTIFY_CONNECTION_KEY
    );
    return connection?.userId;
}

async function readTrackPlaylistCache(userId?: string) {
    if (trackPlaylistCache) {
        trackPlaylistCache = hydrateTrackPlaylistCache(
            trackPlaylistCache,
            userId
        );
        return trackPlaylistCache;
    }

    const stored = await getFromStorage<Partial<TrackPlaylistCache>>(
        TRACK_PLAYLIST_CACHE_KEY
    );
    trackPlaylistCache = hydrateTrackPlaylistCache(stored, userId);
    return trackPlaylistCache;
}

async function writeTrackPlaylistCache(next: TrackPlaylistCache) {
    trackPlaylistCache = next;
    await setInStorage(TRACK_PLAYLIST_CACHE_KEY, next);
}

export async function resolveTrackPlaylistCache(userId?: string) {
    const resolvedUserId = userId ?? (await getCurrentUserId());
    const cache = await readTrackPlaylistCache(resolvedUserId);
    return { userId: resolvedUserId, cache };
}

export async function updateTrackPlaylistCache(
    userId: string | undefined,
    update: (
        cache: TrackPlaylistCache,
        now: number,
        resolvedUserId: string | undefined
    ) => TrackPlaylistCache
) {
    const { userId: resolvedUserId, cache } =
        await resolveTrackPlaylistCache(userId);
    const now = Date.now();
    const next = update(cache, now, resolvedUserId);
    await writeTrackPlaylistCache(next);
    return { userId: resolvedUserId, cache: next, now };
}

export function resolveCachedCatalog(
    cache: TrackPlaylistCache,
    userId?: string
): {
    playlists: PlaylistCatalogEntry[];
    fresh: boolean;
    usable: boolean;
    complete: boolean;
} {
    const catalog = cache.catalog;
    if (!catalog) {
        return { playlists: [], fresh: false, usable: false, complete: false };
    }
    if (catalog.userId && userId && catalog.userId !== userId) {
        return { playlists: [], fresh: false, usable: false, complete: false };
    }
    return {
        playlists: catalog.playlists,
        fresh: catalog.complete && isFresh(catalog.fetchedAt, CATALOG_FRESH_MS),
        usable: isFresh(catalog.fetchedAt, CATALOG_USABLE_MS),
        complete: catalog.complete,
    };
}

export function getTrackPlaylistIndexEntry(
    cache: TrackPlaylistCache,
    playlistId: string
) {
    return cache.membershipsByPlaylistId[playlistId];
}

export function isUsableTrackPlaylistIndex({
    entry,
    snapshotId,
    maxAgeMs,
}: {
    entry?: PlaylistTrackIndexCacheEntry;
    snapshotId: string;
    maxAgeMs: number;
}) {
    return Boolean(
        entry &&
            entry.snapshotId === snapshotId &&
            isFresh(entry.updatedAt, maxAgeMs)
    );
}
