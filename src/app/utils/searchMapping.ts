import type {
    ItemTypes,
    SearchResults,
    SimplifiedPlaylist,
} from '@spotify/web-api-ts-sdk';

import {
    albumToItem,
    artistToItem,
    audiobookToItem,
    episodeToItem,
    playlistToItem,
    showToItem,
    trackToItem,
} from '../../shared/media';
import {
    DEFAULT_SEARCH_TYPES,
    SEARCH_LIMIT,
    type SearchType,
} from '../../shared/search';
import type { MediaShelfItem } from '../types/mediaShelf';

export type SearchOffsets = Record<SearchType, number | null>;

type SearchMappingResult = {
    items: MediaShelfItem[];
    hasMore: boolean;
};

const SEARCH_TYPE_MAPPERS: Record<
    SearchType,
    (
        result: SearchResults<ItemTypes[]> | SearchResults<[ItemTypes]>,
        locale: string
    ) => SearchMappingResult
> = {
    track: (result) => ({
        items: result.tracks?.items.map(trackToItem) ?? [],
        hasMore: Boolean(result.tracks?.next),
    }),
    album: (result) => ({
        items: result.albums?.items.map(albumToItem) ?? [],
        hasMore: Boolean(result.albums?.next),
    }),
    artist: (result) => ({
        items: result.artists?.items.map(artistToItem) ?? [],
        hasMore: Boolean(result.artists?.next),
    }),
    playlist: (result) => ({
        items:
            result.playlists?.items
                .filter((item): item is SimplifiedPlaylist => Boolean(item))
                .map(playlistToItem) ?? [],
        hasMore: Boolean(result.playlists?.next),
    }),
    show: (result) => ({
        items: result.shows?.items.map(showToItem) ?? [],
        hasMore: Boolean(result.shows?.next),
    }),
    episode: (result, locale) => ({
        items:
            result.episodes?.items.map((episode) =>
                episodeToItem(episode, locale)
            ) ?? [],
        hasMore: Boolean(result.episodes?.next),
    }),
    audiobook: (result) => ({
        items: result.audiobooks?.items.map(audiobookToItem) ?? [],
        hasMore: Boolean(result.audiobooks?.next),
    }),
};

export const buildSearchOffsets = (
    result: SearchResults<ItemTypes[]>,
    pageSize: number
): SearchOffsets => ({
    track: result.tracks?.next ? pageSize : null,
    album: result.albums?.next ? pageSize : null,
    artist: result.artists?.next ? pageSize : null,
    playlist: result.playlists?.next ? pageSize : null,
    show: result.shows?.next ? pageSize : null,
    episode: result.episodes?.next ? pageSize : null,
    audiobook: result.audiobooks?.next ? pageSize : null,
});

export const mapSearchResults = (
    result: SearchResults<ItemTypes[]>,
    locale: string
) => {
    const itemsByType = {} as Record<SearchType, MediaShelfItem[]>;
    const hasMoreByType = {} as Record<SearchType, boolean>;

    DEFAULT_SEARCH_TYPES.forEach((type) => {
        const mapped = SEARCH_TYPE_MAPPERS[type](result, locale);
        itemsByType[type] = mapped.items;
        hasMoreByType[type] = mapped.hasMore;
    });

    return { itemsByType, hasMoreByType };
};

export const mapSearchPage = ({
    type,
    result,
    locale,
    offset,
    limit = SEARCH_LIMIT,
}: {
    type: SearchType;
    result: SearchResults<[ItemTypes]>;
    locale: string;
    offset: number;
    limit?: number;
}) => {
    const mapped = SEARCH_TYPE_MAPPERS[type](result, locale);
    const { items, hasMore } = mapped;

    return { items, hasMore, nextOffset: hasMore ? offset + limit : null };
};
