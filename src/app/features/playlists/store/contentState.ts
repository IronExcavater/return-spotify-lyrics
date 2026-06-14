import type { Episode, Market, Track } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../../../shared/messaging';
import { sumDurationMs } from '../../../utils/mediaLookup';
import {
    isFresh,
    resolveCachedCatalog,
    resolveTrackPlaylistCache,
    updateTrackPlaylistCache,
} from './cache';
import {
    toPlaylistEntry,
    upsertPlaylistCatalogEntry,
    withCatalogCache,
} from './catalog';
import {
    buildPlaylistContentChunks,
    mapPlaylistContentItems,
    normalizePlaylist,
    prunePlaylistContentEntries,
    resolvePlaylistContentStateFromEntry,
} from './contentItems';
import {
    PLAYLIST_CONTENT_FRESH_MS,
    PLAYLIST_CONTENT_USABLE_MS,
    PLAYLIST_PAGE_SIZE,
    type CachedPlaylistContentResult,
    type PlaylistContentCacheEntry,
    type PlaylistContentState,
} from './model';
import { buildTrackPlaylistIndexFromState } from './trackIndex';

async function persistPlaylistContentState({
    state,
    userId,
}: {
    state: Omit<PlaylistContentState, 'fetchedAt'>;
    userId?: string;
}) {
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
}

export async function getCachedPlaylistContentState(
    playlistId: string
): Promise<CachedPlaylistContentResult> {
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
}

export const storePlaylistContentState = async (
    state: Omit<PlaylistContentState, 'fetchedAt'>
) => persistPlaylistContentState({ state });

export async function loadPlaylistContentState({
    playlistId,
    market,
    locale,
}: {
    playlistId: string;
    market: Market;
    locale: string;
}) {
    const playlist = await sendSpotifyMessage('getPlaylist', {
        id: playlistId,
        market,
    });
    const normalizedPlaylist = normalizePlaylist(playlist);
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
            playlist: normalizedPlaylist,
            items,
            totalDurationMs: sumDurationMs(tracks),
            itemsOffset: nextOffset,
            itemsHasMore: nextOffset < totalItems,
            itemsLoadingMore: false,
            snapshotId: normalizedPlaylist.snapshot_id,
        },
    });
}

export async function ensurePlaylistContentStateLoaded({
    playlistId,
    market,
    locale,
    base,
}: {
    playlistId: string;
    market: Market;
    locale: string;
    base?: PlaylistContentState | null;
}) {
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
}
