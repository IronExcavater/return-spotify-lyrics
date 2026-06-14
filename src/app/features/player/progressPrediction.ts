import type { PlaybackState } from '@spotify/web-api-ts-sdk';

const PROGRESS_FRAME_EPSILON_MS = 16;
const SEEK_PREDICTION_HOLD_MS = 2000;
const SEEK_SETTLE_EPSILON_MS = 900;

type SnapshotPatch = {
    progressMs?: number;
    durationMs?: number;
};

export function createPlaybackProgressController({
    applyControl,
    getCurrentTrackUri,
    setSnapshot,
}: {
    applyControl: () => void;
    getCurrentTrackUri: () => string | null;
    setSnapshot: (next: SnapshotPatch) => void;
}) {
    let baseProgress = 0;
    let lastSyncAt: number | null = null;
    const pendingSeek = {
        targetMs: null as number | null,
        trackUri: null as string | null,
        expiresAt: 0,
    };

    return {
        setLocalProgress(
            progressMs: number,
            options?: { assumeControl?: boolean; holdUntilServer?: boolean }
        ) {
            if (options?.assumeControl) applyControl();

            baseProgress = progressMs;
            lastSyncAt = Date.now();
            setSnapshot({ progressMs });

            if (!options?.holdUntilServer) return;
            pendingSeek.targetMs = progressMs;
            pendingSeek.trackUri = getCurrentTrackUri();
            pendingSeek.expiresAt = Date.now() + SEEK_PREDICTION_HOLD_MS;
        },

        anchorTo(progressMs: number) {
            baseProgress = progressMs;
            lastSyncAt = Date.now();
        },

        settleServerPlayback(
            playback: PlaybackState | null,
            latestProgress: number,
            now: number
        ) {
            const pendingSeekTarget = pendingSeek.targetMs;
            const pendingSeekTrackMatches =
                pendingSeekTarget == null ||
                pendingSeek.trackUri == null ||
                playback?.item?.uri == null ||
                pendingSeek.trackUri === playback.item.uri;
            const pendingSeekExpired =
                pendingSeekTarget != null && now >= pendingSeek.expiresAt;
            const pendingSeekSettled =
                pendingSeekTarget != null &&
                playback != null &&
                Math.abs(latestProgress - pendingSeekTarget) <=
                    SEEK_SETTLE_EPSILON_MS;
            const shouldHoldLocalSeekProgress =
                pendingSeekTarget != null &&
                playback != null &&
                !pendingSeekExpired &&
                !pendingSeekSettled &&
                pendingSeekTrackMatches;

            if (
                pendingSeekTarget != null &&
                (!shouldHoldLocalSeekProgress || !pendingSeekTrackMatches)
            ) {
                pendingSeek.targetMs = null;
                pendingSeek.trackUri = null;
                pendingSeek.expiresAt = 0;
            }

            if (shouldHoldLocalSeekProgress) {
                setSnapshot({
                    durationMs: playback?.item?.duration_ms ?? 0,
                });
                return;
            }

            baseProgress = latestProgress;
            lastSyncAt = Date.now();
            setSnapshot({
                progressMs: latestProgress,
                durationMs: playback?.item?.duration_ms ?? 0,
            });
        },

        tick({
            currentProgressMs,
            durationMs,
            isPlaying,
        }: {
            currentProgressMs: number;
            durationMs: number;
            isPlaying: boolean;
        }) {
            if (durationMs <= 0) return currentProgressMs;

            const elapsed =
                isPlaying && lastSyncAt ? Date.now() - lastSyncAt : 0;
            const next = Math.min(durationMs, baseProgress + elapsed);
            setSnapshot({
                progressMs:
                    Math.abs(currentProgressMs - next) >
                    PROGRESS_FRAME_EPSILON_MS
                        ? next
                        : currentProgressMs,
            });
            return next;
        },

        reset() {
            lastSyncAt = null;
        },
    };
}
