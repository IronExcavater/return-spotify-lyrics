type PlaybackLike = {
    is_playing?: boolean;
    progress_ms?: number | null;
    item?: { uri?: string | null } | null;
} | null;

export type QueueSyncPlan = {
    uris: string[];
    positionMs?: number;
    shouldPauseAfterStart: boolean;
};

const compactUris = (uris: string[]) =>
    uris.filter((uri) => typeof uri === 'string' && uri.trim().length > 0);

export const shouldPlayAfterDeviceTransfer = (playback: PlaybackLike) =>
    playback?.is_playing === true;

export function buildQueueSyncPlan({
    playback,
    upcomingUris,
}: {
    playback: PlaybackLike;
    currentUri?: string;
    upcomingUris: string[];
}): QueueSyncPlan | null {
    const playbackUri = playback?.item?.uri ?? null;
    const resolvedCurrentUri = playbackUri ?? null;
    const queueUris = compactUris(upcomingUris);
    const uris = resolvedCurrentUri
        ? [resolvedCurrentUri, ...queueUris]
        : queueUris;

    if (uris.length === 0) return null;

    const progressMs =
        resolvedCurrentUri === playbackUri &&
        typeof playback?.progress_ms === 'number' &&
        Number.isFinite(playback.progress_ms)
            ? playback.progress_ms
            : undefined;

    return {
        uris,
        positionMs: progressMs,
        shouldPauseAfterStart: playback?.is_playing === false,
    };
}
