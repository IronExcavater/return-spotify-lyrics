import type { Episode, Track } from '@spotify/web-api-ts-sdk';
import type { Query } from 'lrclib-api';

const isTrack = (item: Partial<Track | Episode>): item is Track =>
    item.type === 'track';

export function buildLyricsQueryFromTrack(
    item?: Partial<Track | Episode> | null
): Query | null {
    if (!item || !isTrack(item)) return null;
    if (!item.name?.trim()) return null;

    const artistName = item.artists
        ?.map((artist) => artist.name)
        .filter(Boolean)
        .join(', ');

    if (!artistName) return null;

    return {
        track_name: item.name,
        artist_name: artistName,
        album_name: item.album?.name || undefined,
        duration: item.duration_ms,
    };
}
