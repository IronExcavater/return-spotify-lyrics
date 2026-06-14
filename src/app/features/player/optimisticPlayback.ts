import type { PlaybackState } from '@spotify/web-api-ts-sdk';

import type { PlaybackCapabilityOptimisticState } from './capabilities';

export type OptimisticPlaybackState = PlaybackCapabilityOptimisticState & {
    shuffle?: boolean;
    repeatMode?: 'off' | 'track' | 'context';
    assumeItemChange?: boolean;
    expiresAt: number;
};

export type OptimisticPlaybackPatch = Omit<
    OptimisticPlaybackState,
    'expiresAt'
>;

const OPTIMISTIC_PENDING_MS = 2500;

export function createOptimisticPlaybackController({
    emit,
    getHoldMs,
}: {
    emit: () => void;
    getHoldMs: () => number;
}) {
    let state: OptimisticPlaybackState | null = null;
    let playbackPendingUntil = 0;
    const pendingPlayback = {
        expected: null as boolean | null,
        expiresAt: 0,
    };

    const apply = (patch: OptimisticPlaybackPatch) => {
        state = {
            ...(state ?? {}),
            ...patch,
            expiresAt: Date.now() + getHoldMs(),
        };
        emit();
    };

    const applyControl = (patch: Partial<OptimisticPlaybackPatch> = {}) => {
        apply({
            assumeCanControl: true,
            assumeHasPlayback: true,
            ...patch,
        });
    };

    const setExpectedPlayback = (isPlaying: boolean) => {
        pendingPlayback.expected = isPlaying;
        pendingPlayback.expiresAt = Date.now() + OPTIMISTIC_PENDING_MS;
    };

    return {
        read() {
            return state;
        },

        apply,

        applyControl,

        setExpectedPlayback,

        setPlayback(
            isPlaying: boolean,
            options?: { assumeItemChange?: boolean }
        ) {
            playbackPendingUntil = isPlaying
                ? Date.now() + OPTIMISTIC_PENDING_MS
                : 0;
            setExpectedPlayback(isPlaying);
            applyControl({
                isPlaying,
                assumeItemChange: options?.assumeItemChange,
            });
        },

        settleServerPlayback(playback: PlaybackState | null, now: number) {
            const expected = pendingPlayback.expected;
            const pendingValid =
                expected != null && now < pendingPlayback.expiresAt;
            const playbackMismatchWhilePending =
                pendingValid &&
                playback != null &&
                playback.is_playing !== expected;

            if (expected != null) {
                const settled =
                    !playback ||
                    now >= pendingPlayback.expiresAt ||
                    playback.is_playing === expected;
                if (settled) {
                    pendingPlayback.expected = null;
                    pendingPlayback.expiresAt = 0;
                }
            }

            const keepOptimisticPlayback =
                ((!playback &&
                    state?.assumeHasPlayback === true &&
                    playbackPendingUntil > now) ||
                    playbackMismatchWhilePending) &&
                state != null;
            if (!keepOptimisticPlayback) {
                state = null;
            }
            if (playback) playbackPendingUntil = 0;

            return expected;
        },

        clearExpired(now = Date.now()) {
            if (!state || state.expiresAt > now) return false;
            state = null;
            emit();
            return true;
        },

        getCurrentIsPlaying(playback?: PlaybackState | null) {
            return state?.isPlaying ?? playback?.is_playing ?? false;
        },

        hasPendingItemChange(now = Date.now()) {
            return (
                state?.assumeItemChange === true &&
                pendingPlayback.expected === true &&
                now < pendingPlayback.expiresAt
            );
        },
    };
}
