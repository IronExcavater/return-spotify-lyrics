import type { ItemTypes, MaxInt } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../shared/messaging';

export type SearchResults = {
    albums?: { items: unknown[] };
    artists?: { items: unknown[] };
    playlists?: { items: unknown[] };
    shows?: { items: unknown[] };
    tracks?: { items: unknown[] };
};

type MediaSearchRequest<T> = {
    query: string;
    types: ItemTypes[];
    select: (results: SearchResults) => T[];
    onError: (error: unknown) => void;
    limit?: MaxInt<50>;
    offset?: number;
};

export const isSearchResultItem = <T>(item: unknown): item is T =>
    typeof item === 'object' && item !== null;

export const searchMediaItems = async <T>({
    query,
    types,
    select,
    onError,
    limit = 12,
    offset = 0,
}: MediaSearchRequest<T>) => {
    try {
        if (!query.trim()) return [];
        const results = await sendSpotifyMessage('search', {
            query,
            types,
            limit,
            offset,
        });
        return select(results);
    } catch (error) {
        onError(error);
        return [];
    }
};

export const createTrackSearchQuery = (input: {
    artistName?: string;
    trackName?: string;
    albumName?: string;
}) => {
    if (input.artistName) {
        return `artist:"${input.artistName}"`;
    }
    if (input.trackName) {
        return `track:"${input.trackName}"`;
    }
    if (input.albumName) {
        return `album:"${input.albumName}"`;
    }
    return '';
};

export const createShowSearchQuery = (input: {
    showName: string;
    publisher?: string;
}) => {
    if (input.publisher) {
        return `${input.publisher} ${input.showName}`;
    }
    return input.showName;
};

export const createGenreSearchQuery = ({ genres }: { genres?: string[] }) => {
    const topGenre = genres?.find((genre) => genre.trim().length > 0);
    return topGenre ? `genre:"${topGenre}"` : '';
};
