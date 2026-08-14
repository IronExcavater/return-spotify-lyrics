import { spotifyFetch } from './client';
import type { PlaybackTrack, SpotifyProfile } from './types';

type RawTrack = {
    id: string;
    name: string;
    duration_ms: number;
    artists: Array<{ id?: string; name: string }>;
    album: {
        id: string;
        name: string;
        images: Array<{ url: string; width?: number | null; height?: number | null }>;
    };
};

type RawProfile = {
    account_id?: string;
    id: string;
    display_name: string | null;
    email?: string | null;
    images?: Array<{ url: string; width?: number | null; height?: number | null }>;
};

function mapTrack(track: RawTrack): PlaybackTrack {
    return {
        id: track.id,
        name: track.name,
        durationMs: track.duration_ms,
        artists: track.artists,
        album: track.album,
    };
}

export async function getProfile(accessToken: string): Promise<SpotifyProfile> {
    const profile = await spotifyFetch<RawProfile>('/me', { accessToken });

    return {
        accountId: profile.account_id ?? null,
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email ?? null,
        images: profile.images ?? [],
    };
}

export async function searchTracks(accessToken: string, query: string, limit = 5) {
    const search = new URLSearchParams({
        q: query,
        type: 'track',
        limit: String(Math.min(10, Math.max(1, limit))),
    });
    const result = await spotifyFetch<{ tracks?: { items?: RawTrack[] } }>(
        `/search?${search}`,
        { accessToken }
    );

    return (result.tracks?.items ?? []).map(mapTrack);
}
