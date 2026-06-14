import type { MaxInt } from '@spotify/web-api-ts-sdk';

import {
    albumTrackToItem,
    playlistToItem,
    topArtistToItem,
    trackToItem,
} from '../../../shared/media';
import { sendSpotifyMessage } from '../../../shared/messaging';
import type { MediaShelfItem } from '../../types/mediaShelf';

export type HomeSectionId =
    | 'recent'
    | 'top-tracks'
    | 'top-artists'
    | 'new-releases'
    | 'user-playlists'
    | 'saved-tracks';

const MIN_TOP_ITEMS = 12;
const TOP_FALLBACK_LIMIT = 50;
const TOP_FALLBACK_TIME_RANGES = ['medium_term', 'long_term'] as const;

const dedupeItems = (items: MediaShelfItem[]) => {
    const seen = new Set<string>();

    return items.filter((item) => {
        if (!item.id) return true;
        if (seen.has(item.id)) return false;

        seen.add(item.id);
        return true;
    });
};

const mergeUniqueItems = (
    primaryItems: MediaShelfItem[],
    fallbackItems: MediaShelfItem[]
) => {
    const merged = new Map<string, MediaShelfItem>();

    primaryItems.forEach((item) => {
        if (item.id) merged.set(item.id, item);
    });

    fallbackItems.forEach((item) => {
        if (!item.id || merged.has(item.id)) return;

        merged.set(item.id, item);
    });

    return Array.from(merged.values()).slice(0, TOP_FALLBACK_LIMIT);
};

const loadRecentItems = async () => {
    const recentlyPlayed = await sendSpotifyMessage('getRecentlyPlayedTracks', {
        limit: 20,
    });

    return dedupeItems(
        recentlyPlayed.items.map((entry) => trackToItem(entry.track))
    );
};

type TopItemsTimeRange = 'short_term' | 'medium_term' | 'long_term';

async function loadTopItemsWithFallback<T>({
    getItems,
    mapItem,
}: {
    getItems: (params: {
        limit: MaxInt<50>;
        timeRange: TopItemsTimeRange;
    }) => Promise<{ items: T[] }>;
    mapItem: (item: T) => MediaShelfItem;
}) {
    const shortTerm = await getItems({ limit: 20, timeRange: 'short_term' });
    const shortTermItems = shortTerm.items.map(mapItem);
    if (shortTermItems.length >= MIN_TOP_ITEMS) return shortTermItems;

    const fallbacks = await Promise.allSettled(
        TOP_FALLBACK_TIME_RANGES.map((timeRange) =>
            getItems({ limit: TOP_FALLBACK_LIMIT, timeRange })
        )
    );
    const fallbackItems = fallbacks.flatMap((result) =>
        result.status === 'fulfilled' ? result.value.items.map(mapItem) : []
    );

    return mergeUniqueItems(shortTermItems, fallbackItems);
}

const loadTopTrackItems = () =>
    loadTopItemsWithFallback({
        getItems: (params) => sendSpotifyMessage('getTopTracks', params),
        mapItem: trackToItem,
    });

const loadTopArtistItems = () =>
    loadTopItemsWithFallback({
        getItems: (params) => sendSpotifyMessage('getTopArtists', params),
        mapItem: topArtistToItem,
    });

const loadNewReleaseItems = async () => {
    const newReleases = await sendSpotifyMessage('getNewReleases', {
        limit: 20,
    });
    const albums = newReleases.albums.items
        .filter((album) => Boolean(album.id))
        .slice(0, 8);
    const albumTrackPages = await Promise.allSettled(
        albums.map((album) =>
            sendSpotifyMessage('getAlbumTracks', {
                id: album.id!,
                limit: Math.min(3, Math.max(1, album.total_tracks ?? 1)) as
                    | 1
                    | 2
                    | 3,
            })
        )
    );

    return dedupeItems(
        albumTrackPages
            .flatMap((result, index) =>
                result.status === 'fulfilled'
                    ? result.value.items.map((track) =>
                          albumTrackToItem(track, albums[index])
                      )
                    : []
            )
            .slice(0, 20)
    );
};

const loadUserPlaylistItems = async () => {
    const userPlaylists = await sendSpotifyMessage('getUserPlaylists', {
        limit: 20,
    });

    return userPlaylists.items.map((playlist) => playlistToItem(playlist));
};

const loadSavedTrackItems = async () => {
    const saved = await sendSpotifyMessage('getSavedTracks', { limit: 20 });

    return saved.items.map((entry) => trackToItem(entry.track));
};

export const HOME_SECTION_LOADERS: Record<
    HomeSectionId,
    () => Promise<MediaShelfItem[]>
> = {
    recent: loadRecentItems,
    'top-tracks': loadTopTrackItems,
    'top-artists': loadTopArtistItems,
    'new-releases': loadNewReleaseItems,
    'user-playlists': loadUserPlaylistItems,
    'saved-tracks': loadSavedTrackItems,
};
