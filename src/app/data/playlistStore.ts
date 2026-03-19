import type {
    Episode,
    Market,
    Playlist,
    PlaylistedTrack,
    SimplifiedPlaylist,
    Track,
} from '@spotify/web-api-ts-sdk';

import { episodeToItem, trackToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import { getFromStorage, setInStorage } from '../../shared/storage';
import type { MediaItem } from '../../shared/types';
import type { SpotifyConnectionMeta } from '../hooks/useAuth';
import { sumDurationMs } from '../utils/mediaLookup';
import type { PlaylistDedupableItem } from '../utils/playlistDuplicates';

const SPOTIFY_CONNECTION_KEY = 'spotifyConnectionMeta';
const TRACK_PLAYLIST_CACHE_KEY = 'trackPlaylistCache';
const LIKED_STALE_MS = 5 * 60 * 1000;
const CATALOG_FRESH_MS = 15 * 60 * 1000;
const CATALOG_USABLE_MS = 7 * 24 * 60 * 60 * 1000;
const PARTIAL_MEMBERSHIP_USABLE_MS = 24 * 60 * 60 * 1000;
const PLAYLIST_CONTENT_FRESH_MS = 5 * 60 * 1000;
const PLAYLIST_CONTENT_USABLE_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYLIST_CONTENT_CACHE_LIMIT = 6;
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

export const LIKED_PLAYLIST_ID = '__liked_tracks__';
export const PLAYLIST_PAGE_SIZE = 50;

export type TrackPlaylistTarget = {
    trackId: string;
    trackUri: string;
};

export type PlaylistCatalogEntry = {
    id: string;
    name: string;
    imageUrl?: string;
    ownerName?: string;
    snapshotId: string;
    total: number;
    editable: boolean;
};

export type PlaylistContentState = {
    playlist: Playlist<Track>;
    items: PlaylistDedupableItem[];
    totalDurationMs: number;
    itemsOffset: number;
    itemsHasMore: boolean;
    itemsLoadingMore: boolean;
    snapshotId?: string;
    fetchedAt: number;
};

type LikedMembershipCache = {
    userId?: string;
    liked: Record<string, { saved: boolean; updatedAt: number }>;
};

type PlaylistCatalogCache = {
    userId?: string;
    fetchedAt: number;
    complete: boolean;
    playlists: PlaylistCatalogEntry[];
};

type PlaylistTrackIndexCacheEntry = {
    playlistId: string;
    snapshotId: string;
    total: number;
    loadedCount: number;
    trackIds: string[];
    updatedAt: number;
};

type PlaylistContentChunkCacheEntry = {
    offset: number;
    items: PlaylistDedupableItem[];
    trackIds: string[];
    cumulativeDurationMs: number;
    updatedAt: number;
};

type PlaylistContentCacheEntry = {
    playlistId: string;
    snapshotId: string;
    total: number;
    playlist?: Playlist<Track>;
    fetchedAt: number;
    updatedAt: number;
    chunksByOffset: Record<string, PlaylistContentChunkCacheEntry>;
};

type TrackPlaylistCache = {
    userId?: string;
    catalog?: PlaylistCatalogCache;
    membershipsByPlaylistId: Record<string, PlaylistTrackIndexCacheEntry>;
    contentsByPlaylistId: Record<string, PlaylistContentCacheEntry>;
};

type TrackPlaylistsResult = {
    userId?: string;
    catalog: PlaylistCatalogEntry[];
    membership: Record<string, boolean | null>;
    loadingById: Record<string, boolean>;
    needsLikedRefresh: boolean;
};

type CachedPlaylistContentResult = {
    entry: PlaylistContentState | null;
    fresh: boolean;
    usable: boolean;
};

const likedCache: LikedMembershipCache = {
    userId: undefined,
    liked: {},
};
const likedPromises = new Map<string, Promise<boolean>>();
let trackPlaylistCache: TrackPlaylistCache | null = null;

const parseSpotifyTrackId = (value?: string) => {
    if (!value) return undefined;

    const uriMatch = /^spotify:track:([A-Za-z0-9]{22})$/.exec(value);
    if (uriMatch) return uriMatch[1];

    return SPOTIFY_ID_PATTERN.test(value) ? value : undefined;
};

const toPlaylistEntry = (
    playlist: SimplifiedPlaylist,
    currentUserId?: string
): PlaylistCatalogEntry => ({
    id: playlist.id,
    name: playlist.name,
    imageUrl: playlist.images?.[0]?.url,
    ownerName: playlist.owner?.display_name ?? undefined,
    snapshotId: playlist.snapshot_id,
    total: playlist.tracks?.total ?? 0,
    editable: playlist.collaborative || playlist.owner?.id === currentUserId,
});

const getCurrentUserId = async () => {
    const connection = await getFromStorage<SpotifyConnectionMeta>(
        SPOTIFY_CONNECTION_KEY
    );
    return connection?.userId;
};

const createEmptyTrackPlaylistCache = (
    userId?: string
): TrackPlaylistCache => ({
    userId,
    membershipsByPlaylistId: {},
    contentsByPlaylistId: {},
});

const isFresh = (updatedAt: number | undefined, maxAgeMs: number) =>
    Boolean(updatedAt && Date.now() - updatedAt < maxAgeMs);

const hydrateTrackPlaylistCache = (
    value: Partial<TrackPlaylistCache> | undefined,
    userId?: string
): TrackPlaylistCache => {
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
};

const readTrackPlaylistCache = async (userId?: string) => {
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
};

const writeTrackPlaylistCache = async (next: TrackPlaylistCache) => {
    trackPlaylistCache = next;
    await setInStorage(TRACK_PLAYLIST_CACHE_KEY, next);
};

const resolveTrackPlaylistCache = async (userId?: string) => {
    const resolvedUserId = userId ?? (await getCurrentUserId());
    const cache = await readTrackPlaylistCache(resolvedUserId);
    return { userId: resolvedUserId, cache };
};

const updateTrackPlaylistCache = async (
    userId: string | undefined,
    update: (
        cache: TrackPlaylistCache,
        now: number,
        resolvedUserId: string | undefined
    ) => TrackPlaylistCache
) => {
    const { userId: resolvedUserId, cache } =
        await resolveTrackPlaylistCache(userId);
    const now = Date.now();
    const next = update(cache, now, resolvedUserId);
    await writeTrackPlaylistCache(next);
    return { userId: resolvedUserId, cache: next, now };
};

const resolveCachedCatalog = (
    cache: TrackPlaylistCache,
    userId?: string
): {
    playlists: PlaylistCatalogEntry[];
    fresh: boolean;
    usable: boolean;
    complete: boolean;
} => {
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
};

const getTrackPlaylistIndexEntry = (
    cache: TrackPlaylistCache,
    playlistId: string
) => cache.membershipsByPlaylistId[playlistId];

const isUsableTrackPlaylistIndex = ({
    entry,
    snapshotId,
    maxAgeMs,
}: {
    entry?: PlaylistTrackIndexCacheEntry;
    snapshotId: string;
    maxAgeMs: number;
}) =>
    Boolean(
        entry &&
            entry.snapshotId === snapshotId &&
            isFresh(entry.updatedAt, maxAgeMs)
    );

const resolveCachedPlaylistMembership = ({
    playlist,
    trackId,
    cache,
}: {
    playlist: PlaylistCatalogEntry;
    trackId: string;
    cache: TrackPlaylistCache;
}) => {
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
};

const createPlaylistItemKey = (entry: PlaylistedTrack, index: number) => {
    const base =
        entry.track?.uri ?? entry.track?.id ?? entry.track?.name ?? 'track';
    const added = entry.added_at ?? 'unknown';
    return `${base}:${added}:${index}`;
};

export const mapPlaylistContentItems = (
    entries: Array<PlaylistedTrack> = [],
    locale: string,
    offset: number
): PlaylistDedupableItem[] => {
    const safeEntries = Array.isArray(entries) ? entries : [];
    return safeEntries.map((entry, index) => {
        const track = entry.track;
        const item: MediaItem | null = track
            ? track.type === 'episode'
                ? episodeToItem(track as Episode, locale)
                : trackToItem(track as Track)
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
};

const getTrackIds = (items: PlaylistDedupableItem[]) =>
    items
        .map((item) => item.playlistTrackId)
        .filter((trackId): trackId is string => Boolean(trackId));

const mergeTrackIds = (...values: string[][]) =>
    Array.from(new Set(values.flat()));

const sumItemDurations = (items: PlaylistDedupableItem[]) =>
    items.reduce((total, item) => total + (item.durationMs ?? 0), 0);

const buildPlaylistContentChunks = (
    items: PlaylistDedupableItem[],
    updatedAt: number
) => {
    let cumulativeDurationMs = 0;
    const chunksByOffset: Record<string, PlaylistContentChunkCacheEntry> = {};

    for (let offset = 0; offset < items.length; offset += PLAYLIST_PAGE_SIZE) {
        const chunkItems = items.slice(offset, offset + PLAYLIST_PAGE_SIZE);
        cumulativeDurationMs += sumItemDurations(chunkItems);
        chunksByOffset[offset] = {
            offset,
            items: chunkItems,
            trackIds: getTrackIds(chunkItems),
            cumulativeDurationMs,
            updatedAt,
        };
    }

    return chunksByOffset;
};

const prunePlaylistContentEntries = (
    entriesById: Record<string, PlaylistContentCacheEntry>
) => {
    const trimmedEntries = Object.values(entriesById)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, PLAYLIST_CONTENT_CACHE_LIMIT);

    return Object.fromEntries(
        trimmedEntries.map((entry) => [entry.playlistId, entry])
    );
};

const resolvePlaylistContentStateFromEntry = (
    entry?: PlaylistContentCacheEntry
): {
    state: PlaylistContentState | null;
    chunksFresh: boolean;
    chunksUsable: boolean;
} => {
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
};

const upsertPlaylistCatalogEntry = (
    playlists: PlaylistCatalogEntry[],
    nextEntry: PlaylistCatalogEntry
) => {
    const nextPlaylists = [...playlists];
    const index = nextPlaylists.findIndex((item) => item.id === nextEntry.id);
    if (index >= 0) nextPlaylists[index] = nextEntry;
    else nextPlaylists.unshift(nextEntry);
    return nextPlaylists;
};

const createTrackPlaylistIndexEntry = ({
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
}): PlaylistTrackIndexCacheEntry => ({
    playlistId,
    snapshotId,
    total,
    loadedCount: Math.min(total, Math.max(0, loadedCount)),
    trackIds: Array.from(new Set(trackIds)),
    updatedAt,
});

const buildTrackPlaylistIndexFromState = (
    state: Omit<PlaylistContentState, 'fetchedAt'>,
    snapshotId: string,
    total: number,
    updatedAt: number
) =>
    createTrackPlaylistIndexEntry({
        playlistId: state.playlist.id,
        snapshotId,
        total,
        loadedCount: state.itemsOffset,
        trackIds: getTrackIds(state.items),
        updatedAt,
    });

const withCatalogCache = ({
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
}): TrackPlaylistCache => ({
    ...cache,
    userId: userId ?? cache.userId,
    catalog: {
        userId,
        fetchedAt,
        complete,
        playlists,
    },
});

const upsertTrackPlaylistCatalog = async ({
    playlists,
    userId,
    complete,
}: {
    playlists: PlaylistCatalogEntry[];
    userId?: string;
    complete: boolean;
}) => {
    await updateTrackPlaylistCache(userId, (cache, now) =>
        withCatalogCache({
            cache,
            playlists,
            userId,
            fetchedAt: now,
            complete,
        })
    );
};

const patchTrackPlaylistCatalogEntry = async ({
    playlistId,
    snapshotId,
    total,
    userId,
}: {
    playlistId: string;
    snapshotId: string;
    total: number;
    userId?: string;
}) => {
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
};

const persistPlaylistContentState = async ({
    state,
    userId,
}: {
    state: Omit<PlaylistContentState, 'fetchedAt'>;
    userId?: string;
}) => {
    const { cache, now } = await updateTrackPlaylistCache(
        userId,
        (currentCache, currentNow, resolvedUserId) => {
            const snapshotId = state.snapshotId ?? state.playlist.snapshot_id;
            const existing =
                currentCache.contentsByPlaylistId[state.playlist.id];
            const nextChunks = buildPlaylistContentChunks(
                state.items,
                currentNow
            );
            const preservedChunks =
                existing?.snapshotId === snapshotId
                    ? Object.fromEntries(
                          Object.entries(existing.chunksByOffset).filter(
                              ([offset]) => Number(offset) >= state.itemsOffset
                          )
                      )
                    : {};
            const nextContentEntry: PlaylistContentCacheEntry = {
                playlistId: state.playlist.id,
                snapshotId,
                total: state.playlist.tracks.total ?? state.itemsOffset,
                playlist: state.playlist,
                fetchedAt: currentNow,
                updatedAt: currentNow,
                chunksByOffset: {
                    ...preservedChunks,
                    ...nextChunks,
                },
            };
            const currentCatalog = resolveCachedCatalog(
                currentCache,
                resolvedUserId
            ).playlists;
            const nextCatalogEntry = toPlaylistEntry(
                state.playlist,
                resolvedUserId
            );

            return withCatalogCache({
                cache: {
                    ...currentCache,
                    membershipsByPlaylistId: {
                        ...currentCache.membershipsByPlaylistId,
                        [state.playlist.id]: buildTrackPlaylistIndexFromState(
                            state,
                            snapshotId,
                            nextContentEntry.total,
                            currentNow
                        ),
                    },
                    contentsByPlaylistId: prunePlaylistContentEntries({
                        ...currentCache.contentsByPlaylistId,
                        [state.playlist.id]: nextContentEntry,
                    }),
                },
                playlists: upsertPlaylistCatalogEntry(
                    currentCatalog,
                    nextCatalogEntry
                ),
                userId: resolvedUserId,
                fetchedAt: currentCache.catalog?.fetchedAt ?? currentNow,
                complete: currentCache.catalog?.complete ?? false,
            });
        }
    );

    const contentEntry = cache.contentsByPlaylistId[state.playlist.id];
    const resolvedContent = resolvePlaylistContentStateFromEntry(contentEntry);
    return (
        resolvedContent.state ?? {
            ...state,
            fetchedAt: now,
        }
    );
};

export const primeTrackPlaylistCatalogCache = async (userId?: string) => {
    try {
        await loadTrackPlaylistCatalog(userId);
    } catch {
        // Keep stale cache if the background refresh fails.
    }
};

const storeTrackPlaylistLoadedItems = async ({
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
}) => {
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
};

const syncLikedCacheOwner = (userId?: string) => {
    if (userId === likedCache.userId) return;

    likedCache.userId = userId;
    likedCache.liked = {};
    likedPromises.clear();
};

const isLikedFresh = (trackId: string) => {
    const liked = likedCache.liked[trackId];
    return Boolean(liked && Date.now() - liked.updatedAt < LIKED_STALE_MS);
};

export const resolveTrackPlaylistTarget = (
    item?: MediaItem | null
): TrackPlaylistTarget | null => {
    if (item?.kind !== 'track') return null;

    const trackId =
        parseSpotifyTrackId(item.id) ?? parseSpotifyTrackId(item.uri);
    if (!trackId) return null;

    const trackUri = item.uri?.startsWith('spotify:track:')
        ? item.uri
        : `spotify:track:${trackId}`;

    return { trackId, trackUri };
};

export const canManageTrackPlaylists = (item?: MediaItem | null) =>
    Boolean(resolveTrackPlaylistTarget(item));

export const formatTrackPlaylistError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (
        lower.includes('scope') ||
        lower.includes('insufficient') ||
        lower.includes('permission')
    ) {
        return 'Reconnect Spotify to load playlists.';
    }
    if (lower.includes('rate') || lower.includes('429')) {
        return 'Spotify is rate limiting playlist requests. Try again shortly.';
    }
    return message || fallback;
};

export const loadTrackPlaylists = async (
    target: TrackPlaylistTarget
): Promise<TrackPlaylistsResult> => {
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
};

export const loadTrackPlaylistCatalog = async (userId?: string) => {
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
};

export const ensureTrackLikedMembership = async ({
    trackId,
    userId,
}: {
    trackId: string;
    userId?: string;
}) => {
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
};

const toResolvedTrackPlaylistIndex = (entry: PlaylistTrackIndexCacheEntry) => ({
    playlistId: entry.playlistId,
    snapshotId: entry.snapshotId,
    total: entry.total,
    trackIds: entry.trackIds,
    updatedAt: entry.updatedAt,
});

export const ensureTrackPlaylistIndex = async ({
    playlist,
    userId,
    trackId,
}: {
    playlist: PlaylistCatalogEntry;
    userId?: string;
    trackId?: string;
}) => {
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
};

export const toggleTrackPlaylistMembership = async ({
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
}) => {
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
};

export const getCachedPlaylistContentState = async (
    playlistId: string
): Promise<CachedPlaylistContentResult> => {
    const { cache } = await resolveTrackPlaylistCache();
    const contentEntry = cache.contentsByPlaylistId[playlistId];
    const resolved = resolvePlaylistContentStateFromEntry(contentEntry);

    if (!contentEntry || !resolved.state) {
        return { entry: null, fresh: false, usable: false };
    }

    return {
        entry: resolved.state,
        fresh:
            isFresh(contentEntry.fetchedAt, PLAYLIST_CONTENT_FRESH_MS) &&
            resolved.chunksFresh,
        usable:
            isFresh(contentEntry.updatedAt, PLAYLIST_CONTENT_USABLE_MS) &&
            resolved.chunksUsable,
    };
};

export const storePlaylistContentState = async (
    state: Omit<PlaylistContentState, 'fetchedAt'>
) => persistPlaylistContentState({ state });

export const loadPlaylistContentState = async ({
    playlistId,
    market,
    locale,
}: {
    playlistId: string;
    market: Market;
    locale: string;
}) => {
    const playlist = await sendSpotifyMessage('getPlaylist', {
        id: playlistId,
        market,
    });
    const pageItems = Array.isArray(playlist.tracks?.items)
        ? playlist.tracks.items
        : [];
    const tracks = pageItems
        .map((entry) => entry.track)
        .filter(Boolean) as Array<Track | Episode>;
    const items = mapPlaylistContentItems(pageItems, locale, 0);
    const nextOffset = pageItems.length;
    const totalItems = playlist.tracks?.total ?? nextOffset;

    return persistPlaylistContentState({
        state: {
            playlist,
            items,
            totalDurationMs: sumDurationMs(tracks),
            itemsOffset: nextOffset,
            itemsHasMore: nextOffset < totalItems,
            itemsLoadingMore: false,
            snapshotId: playlist.snapshot_id,
        },
    });
};

export const ensurePlaylistContentStateLoaded = async ({
    playlistId,
    market,
    locale,
    base,
}: {
    playlistId: string;
    market: Market;
    locale: string;
    base?: PlaylistContentState | null;
}) => {
    const cached = (await getCachedPlaylistContentState(playlistId)).entry;
    let working =
        base && cached
            ? cached.snapshotId === base.snapshotId &&
              cached.itemsOffset > base.itemsOffset
                ? cached
                : base
            : (base ?? cached ?? null);

    if (!working) {
        working = await loadPlaylistContentState({
            playlistId,
            market,
            locale,
        });
    }

    if (!working.itemsHasMore) return working;

    let offset = working.itemsOffset;
    let items = [...working.items];
    let totalDurationMs = working.totalDurationMs;
    let hasMore: boolean = working.itemsHasMore;

    while (hasMore) {
        const page = await sendSpotifyMessage('getPlaylistItems', {
            id: playlistId,
            market,
            limit: PLAYLIST_PAGE_SIZE,
            offset,
        });
        const pageItems = page.items ?? [];
        const tracks = pageItems
            .map((entry) => entry.track)
            .filter(Boolean) as Array<Track | Episode>;
        items = [
            ...items,
            ...mapPlaylistContentItems(pageItems, locale, offset),
        ];
        totalDurationMs += sumDurationMs(tracks);
        offset += pageItems.length;
        hasMore = offset < (page.total ?? offset);
        if (pageItems.length === 0) break;

        working = await persistPlaylistContentState({
            state: {
                playlist: working.playlist,
                items,
                totalDurationMs,
                itemsOffset: offset,
                itemsHasMore: hasMore,
                itemsLoadingMore: false,
                snapshotId: working.snapshotId,
            },
        });
        items = working.items;
        totalDurationMs = working.totalDurationMs;
        offset = working.itemsOffset;
        hasMore = working.itemsHasMore;
    }

    if (
        working.itemsOffset !== offset ||
        working.totalDurationMs !== totalDurationMs ||
        working.itemsHasMore !== hasMore
    ) {
        working = await persistPlaylistContentState({
            state: {
                playlist: working.playlist,
                items,
                totalDurationMs,
                itemsOffset: offset,
                itemsHasMore: hasMore,
                itemsLoadingMore: false,
                snapshotId: working.snapshotId,
            },
        });
    }

    return working;
};
