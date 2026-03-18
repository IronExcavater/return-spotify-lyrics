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
import { SEARCH_LIMIT, type SearchType } from '../../shared/search';
import type { MediaShelfItem } from '../components/MediaShelf';

export type SearchOffsets = Record<SearchType, number | null>;

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
    const itemsByType: Record<SearchType, MediaShelfItem[]> = {
        track: result.tracks?.items.map((track) => trackToItem(track)) ?? [],
        album: result.albums?.items.map((album) => albumToItem(album)) ?? [],
        artist:
            result.artists?.items.map((artist) => artistToItem(artist)) ?? [],
        playlist:
            result.playlists?.items
                .filter((item): item is SimplifiedPlaylist => !!item)
                .map((playlist) => playlistToItem(playlist)) ?? [],
        show: result.shows?.items.map((show) => showToItem(show)) ?? [],
        episode:
            result.episodes?.items.map((episode) =>
                episodeToItem(episode, locale)
            ) ?? [],
        audiobook:
            result.audiobooks?.items.map((book) => audiobookToItem(book)) ?? [],
    };

    const hasMoreByType: Record<SearchType, boolean> = {
        track: !!result.tracks?.next,
        album: !!result.albums?.next,
        artist: !!result.artists?.next,
        playlist: !!result.playlists?.next,
        show: !!result.shows?.next,
        episode: !!result.episodes?.next,
        audiobook: !!result.audiobooks?.next,
    };

    return { itemsByType, hasMoreByType };
};

export const mapSearchPage = (
    type: SearchType,
    result: SearchResults<[ItemTypes]>,
    locale: string
) => {
    let items: MediaShelfItem[] = [];
    let hasMore = false;

    switch (type) {
        case 'track': {
            const page = result.tracks;
            items = page?.items.map(trackToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
        case 'album': {
            const page = result.albums;
            items = page?.items.map(albumToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
        case 'artist': {
            const page = result.artists;
            items = page?.items.map(artistToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
        case 'playlist': {
            const page = result.playlists;
            items =
                page?.items
                    .filter((item): item is SimplifiedPlaylist => !!item)
                    .map(playlistToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
        case 'show': {
            const page = result.shows;
            items = page?.items.map(showToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
        case 'episode': {
            const page = result.episodes;
            items =
                page?.items.map((episode) => episodeToItem(episode, locale)) ??
                [];
            hasMore = !!page?.next;
            break;
        }
        case 'audiobook': {
            const page = result.audiobooks;
            items = page?.items.map(audiobookToItem) ?? [];
            hasMore = !!page?.next;
            break;
        }
    }

    return { items, hasMore, nextOffset: hasMore ? SEARCH_LIMIT : null };
};
