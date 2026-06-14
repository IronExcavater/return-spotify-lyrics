import type { PlaybackState } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../../shared/messaging';
import { isNoNextTrackError } from './fallbackPlayback';

const NATURAL_END_DETECTION_MS = 1200;
const NATURAL_END_COOLDOWN_MS = 12000;

type ObservedPlayback = {
    isPlaying: boolean;
    uri: string | null;
    progressMs: number;
    durationMs: number;
};

export function createNaturalEndAdvanceController({
    markPlaybackAdvancing,
    playFallbackTrack,
    sync,
}: {
    markPlaybackAdvancing: () => void;
    playFallbackTrack: (currentUri: string | null) => Promise<boolean>;
    sync: () => void;
}) {
    let previous: ObservedPlayback | null = null;
    let cooldownUntil = 0;
    let lastTrackUri: string | null = null;

    return async function maybeAdvanceAfterNaturalEnd(
        state: PlaybackState | null,
        pendingPlaybackExpected: boolean | null
    ) {
        const now = Date.now();
        const current = {
            isPlaying: state?.is_playing ?? false,
            uri: state?.item?.uri ?? null,
            progressMs: state?.progress_ms ?? 0,
            durationMs: state?.item?.duration_ms ?? 0,
        };
        const ended = previous;
        previous = current;

        if (!ended) return;
        if (pendingPlaybackExpected === false) return;
        if (current.isPlaying) return;
        if (!ended.isPlaying) return;
        if (!ended.uri || current.uri !== ended.uri) return;
        if (ended.durationMs <= 0) return;
        if (ended.durationMs - ended.progressMs > NATURAL_END_DETECTION_MS) {
            return;
        }
        if (lastTrackUri === ended.uri && now < cooldownUntil) return;

        lastTrackUri = ended.uri;
        cooldownUntil = now + NATURAL_END_COOLDOWN_MS;

        try {
            await sendSpotifyMessage('skipToNext');
            markPlaybackAdvancing();
            sync();
            return;
        } catch (error) {
            if (!isNoNextTrackError(error)) return;
        }

        await playFallbackTrack(ended.uri);
    };
}
