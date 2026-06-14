import type { Track } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../../shared/messaging';

const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

export function isNoNextTrackError(error: unknown) {
    const message = getErrorMessage(error);
    return (
        message.includes('NO_NEXT_TRACK') ||
        message.includes('No next track') ||
        message.includes('Restriction violated')
    );
}

export function isNoPreviousTrackError(error: unknown) {
    const message = getErrorMessage(error);
    return (
        message.includes('NO_PREVIOUS_TRACK') ||
        message.includes('No previous track') ||
        message.includes('Restriction violated')
    );
}

async function pickMostPlayedNonRecentTrack(
    excludeUris: string[]
): Promise<Track | null> {
    const [topTracks, recentTracks] = await Promise.all([
        sendSpotifyMessage('getTopTracks', {
            limit: 50,
            timeRange: 'long_term',
        }),
        sendSpotifyMessage('getRecentlyPlayedTracks', {
            limit: 50,
        }),
    ]);

    const excluded = new Set(excludeUris.filter(Boolean));
    const recentIds = new Set(
        (recentTracks?.items ?? [])
            .map((entry) => entry?.track?.id ?? '')
            .filter(Boolean)
    );
    const tracks = topTracks?.items ?? [];

    const preferred = tracks.find(
        (track) =>
            Boolean(track.uri) &&
            !excluded.has(track.uri) &&
            !recentIds.has(track.id ?? '')
    );
    if (preferred) return preferred as Track;

    const fallback = tracks.find(
        (track) => Boolean(track.uri) && !excluded.has(track.uri)
    );
    return (fallback as Track | undefined) ?? null;
}

let noNextFallbackInFlight = false;

export async function playNoNextFallbackTrack({
    currentUri,
    onFallbackTrack,
    onPlaybackStarting,
    onPlaybackStarted,
}: {
    currentUri: string | null;
    onFallbackTrack: (track: Track) => void;
    onPlaybackStarting: () => void;
    onPlaybackStarted: () => void;
}): Promise<boolean> {
    if (noNextFallbackInFlight) return false;
    noNextFallbackInFlight = true;
    try {
        const nextTrack = await pickMostPlayedNonRecentTrack(
            currentUri ? [currentUri] : []
        );
        if (!nextTrack?.uri) return false;

        onFallbackTrack(nextTrack);
        onPlaybackStarting();
        await sendSpotifyMessage('startPlayback', {
            uris: [nextTrack.uri],
        });
        onPlaybackStarted();
        return true;
    } finally {
        noNextFallbackInFlight = false;
    }
}
