import { spotifyFetch } from './client';
import type { PlaybackSnapshot } from './types';

type SpotifyPlayback = {
    is_playing: boolean;
    progress_ms: number | null;
    device?: {
        id: string | null;
        name: string;
        type: string;
        volume_percent: number | null;
    };
    item?: {
        type?: string;
        id?: string;
        name?: string;
        duration_ms?: number;
        artists?: Array<{ id?: string; name?: string }>;
        album?: {
            id?: string;
            name?: string;
            images?: Array<{
                url: string;
                width?: number | null;
                height?: number | null;
            }>;
        };
    } | null;
};

function mapPlayback(value: SpotifyPlayback): PlaybackSnapshot {
    const item = value.item;
    const track =
        item?.type === 'track' &&
        item.id &&
        item.name &&
        item.album?.id &&
        item.album.name
            ? {
                  id: item.id,
                  name: item.name,
                  artists: (item.artists ?? []).map((artist) => ({
                      id: artist.id,
                      name: artist.name ?? 'Unknown artist',
                  })),
                  album: {
                      id: item.album.id,
                      name: item.album.name,
                      images: item.album.images ?? [],
                  },
                  durationMs: item.duration_ms ?? 0,
              }
            : null;

    return {
        isPlaying: value.is_playing,
        progressMs: value.progress_ms ?? 0,
        device: value.device
            ? {
                  id: value.device.id,
                  name: value.device.name,
                  type: value.device.type,
                  volumePercent: value.device.volume_percent,
              }
            : null,
        track,
    };
}

export async function getPlayback(accessToken: string) {
    const value = await spotifyFetch<SpotifyPlayback | undefined>(
        '/me/player',
        {
            accessToken,
        }
    );
    return value ? mapPlayback(value) : null;
}

export function resumePlayback(accessToken: string) {
    return spotifyFetch<void>('/me/player/play', {
        accessToken,
        method: 'PUT',
    });
}

export function pausePlayback(accessToken: string) {
    return spotifyFetch<void>('/me/player/pause', {
        accessToken,
        method: 'PUT',
    });
}

export function nextTrack(accessToken: string) {
    return spotifyFetch<void>('/me/player/next', {
        accessToken,
        method: 'POST',
    });
}

export function previousTrack(accessToken: string) {
    return spotifyFetch<void>('/me/player/previous', {
        accessToken,
        method: 'POST',
    });
}
