import { sendSpotifyMessage } from '../../shared/messaging';

export type SearchResults = {
    albums?: { items: unknown[] };
    artists?: { items: unknown[] };
    playlists?: { items: unknown[] };
    shows?: { items: unknown[] };
    tracks?: { items: unknown[] };
};

export const searchItems = async <T>(
    query: string,
    types: Array<'album' | 'artist' | 'playlist' | 'show' | 'track'>,
    map: (results: SearchResults) => T[],
    onError: (error: unknown) => void
) => {
    try {
        if (!query.trim()) return [];
        const results = await sendSpotifyMessage('search', {
            query,
            types,
            limit: 12,
        });
        return map(results);
    } catch (error) {
        onError(error);
        return [];
    }
};

export const buildTrackRecommendationQuery = (input: {
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

export const buildShowRecommendationQuery = (input: {
    showName: string;
    publisher?: string;
}) => {
    if (input.publisher) {
        return `${input.publisher} ${input.showName}`;
    }
    return input.showName;
};

export const buildPlaylistRecommendationQuery = (name: string) => name;

export const buildGenreRecommendationQuery = (genres?: string[]) => {
    const topGenre = genres?.find((genre) => genre.trim().length > 0);
    return topGenre ? `genre:"${topGenre}"` : '';
};
