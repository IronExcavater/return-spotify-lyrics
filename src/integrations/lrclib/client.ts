import { AppError } from '@/errors/AppError';

import type { LyricsLookup, LyricsSearch, LyricsTrack } from './types';

const LRCLIB_API = 'https://lrclib.net/api';

function params(values: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        if (value != null && value !== '') search.set(key, String(value));
    }
    return search;
}

async function lrclibFetch<T>(path: string): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${LRCLIB_API}${path}`, {
            headers: { Accept: 'application/json' },
        });
    } catch (error) {
        throw new AppError('network.offline', 'Lyrics could not be reached.', { cause: error });
    }

    if (response.status === 404) {
        throw new AppError('lyrics.not_found', 'No matching lyrics were found.');
    }
    if (!response.ok) {
        throw new AppError('lyrics.request_failed', `Lyrics request failed (${response.status}).`);
    }

    return (await response.json()) as T;
}

export function getLyrics(input: LyricsLookup) {
    const search = params({
        track_name: input.trackName,
        artist_name: input.artistName,
        album_name: input.albumName,
        duration: input.duration,
    });
    return lrclibFetch<LyricsTrack>(`/get?${search}`);
}

export function searchLyrics(input: LyricsSearch) {
    const search = params({
        q: input.query,
        track_name: input.trackName,
        artist_name: input.artistName,
        album_name: input.albumName,
    });
    return lrclibFetch<LyricsTrack[]>(`/search?${search}`);
}
