import { Episode, Track } from '@spotify/web-api-ts-sdk';

export interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export interface SpotifyToken extends SpotifyTokenResponse {
    expires_by: number;
}

export function asTrack(item: Track | Episode | undefined): Track | undefined {
    return item && item.type === 'track' ? (item as Track) : undefined;
}

export function asEpisode(
    item: Track | Episode | undefined
): Episode | undefined {
    return item && item.type === 'episode' ? (item as Episode) : undefined;
}
