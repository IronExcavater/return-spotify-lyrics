import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import type {
    SpotifyRpcArgs,
    SpotifyRpcName,
} from '../../background/spotifyRpc';
import {
    sendSpotifyMessage,
    SPOTIFY_RPC_DISPATCH_EVENT,
    type SpotifyRpcDispatchEventDetail,
} from '../../shared/messaging';
import { usePremiumPlaybackBlocked } from '../data/playbackAccess';
import {
    buildShortcutSnapshot,
    getPlaybackCapabilities,
    type PlayerShortcutSnapshot,
} from '../features/player/capabilities';
import {
    isNoNextTrackError,
    isNoPreviousTrackError,
    playNoNextFallbackTrack,
} from '../features/player/fallbackPlayback';
import { createNaturalEndAdvanceController } from '../features/player/naturalEnd';
import { createOptimisticPlaybackController } from '../features/player/optimisticPlayback';
import { playbackAnalytics } from '../features/player/playbackAnalytics';
import { createPlaybackProgressController } from '../features/player/progressPrediction';
import { createVolumePreviewController } from '../features/player/volumePreview';
import { updateCachedNowPlaying } from './mediaCacheEntries';

type PlayerSnapshot = {
    playback: PlaybackState | null | undefined;
    progressMs: number;
    durationMs: number;
};

let snapshot: PlayerSnapshot = {
    playback: undefined,
    progressMs: 0,
    durationMs: 0,
};

const END_SYNC_THRESHOLD_MS = 400;

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let rafId: number | null = null;
let subscriberCount = 0;
let pollIntervalMs = 4000;
let syncInFlight: Promise<void> | null = null;
let syncQueued = false;

const pendingEndSync = { current: false };

const emit = () => {
    listeners.forEach((listener) => listener());
};

const setSnapshot = (next: Partial<PlayerSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
};

const optimisticPlayback = createOptimisticPlaybackController({
    emit,
    getHoldMs: () => pollIntervalMs,
});

const progressPrediction = createPlaybackProgressController({
    applyControl: () => optimisticPlayback.applyControl(),
    getCurrentTrackUri: () => snapshot.playback?.item?.uri ?? null,
    setSnapshot,
});

const volumePreview = createVolumePreviewController({
    emit,
    sync: () => {
        void sync();
    },
});

const playFallbackAfterNoNext = (currentUri: string | null) =>
    playNoNextFallbackTrack({
        currentUri,
        onFallbackTrack: updateCachedNowPlaying,
        onPlaybackStarted: () => {
            void sync();
        },
        onPlaybackStarting: () => {
            setOptimisticPlayback(true, { assumeItemChange: true });
        },
    });

const maybeAdvanceAfterNaturalEnd = createNaturalEndAdvanceController({
    markPlaybackAdvancing: () => {
        setOptimisticPlayback(true, { assumeItemChange: true });
    },
    playFallbackTrack: playFallbackAfterNoNext,
    sync: () => {
        void sync();
    },
});

const setOptimisticProgress = (
    progressMs: number,
    options?: { assumeControl?: boolean; holdUntilServer?: boolean }
) => {
    progressPrediction.setLocalProgress(progressMs, options);
};

const performSync = async () => {
    const state = await sendSpotifyMessage('getPlaybackState');
    const now = Date.now();
    const pendingPlaybackExpected = optimisticPlayback.settleServerPlayback(
        state ?? null,
        now
    );
    setSnapshot({ playback: state ?? null });
    progressPrediction.settleServerPlayback(
        state ?? null,
        state?.progress_ms ?? 0,
        now
    );
    volumePreview.settleServerVolume(state?.device?.volume_percent);

    void maybeAdvanceAfterNaturalEnd(state ?? null, pendingPlaybackExpected);

    playbackAnalytics.stateSynced(state?.is_playing ?? false);

    const item = state?.item;
    if (item) {
        if (item.type === 'track' || item.type === 'episode') {
            updateCachedNowPlaying(item);
        }
        playbackAnalytics.itemChanged(item);
    }
};

function sync() {
    if (syncInFlight) {
        syncQueued = true;
        return syncInFlight;
    }

    syncInFlight = performSync().finally(() => {
        syncInFlight = null;
        if (!syncQueued) return;
        syncQueued = false;
        void sync();
    });

    return syncInFlight;
}

export const syncPlayer = sync;

const tick = () => {
    const playback = snapshot.playback;
    const durationMs = snapshot.durationMs;
    const isPlaying = optimisticPlayback.getCurrentIsPlaying(playback);

    if (durationMs > 0) {
        const nextProgressMs = progressPrediction.tick({
            currentProgressMs: snapshot.progressMs,
            durationMs,
            isPlaying,
        });

        if (isPlaying && !pendingEndSync.current) {
            const remaining = durationMs - nextProgressMs;
            if (remaining <= END_SYNC_THRESHOLD_MS) {
                pendingEndSync.current = true;
                void sync().finally(() => {
                    pendingEndSync.current = false;
                });
            }
        }
    }

    optimisticPlayback.clearExpired();

    rafId = requestAnimationFrame(tick);
};

const startPolling = () => {
    if (pollTimer) return;
    void sync();
    pollTimer = setInterval(() => {
        void sync();
    }, pollIntervalMs);
    rafId = requestAnimationFrame(tick);
};

const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (rafId) cancelAnimationFrame(rafId);
    pollTimer = null;
    rafId = null;
    syncQueued = false;
    pendingEndSync.current = false;
    progressPrediction.reset();
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    subscriberCount += 1;
    if (subscriberCount === 1) startPolling();
    return () => {
        listeners.delete(listener);
        subscriberCount = Math.max(0, subscriberCount - 1);
        if (subscriberCount === 0) stopPolling();
    };
};

const getSnapshot = () => snapshot;
const getCurrentIsPlaying = () =>
    optimisticPlayback.getCurrentIsPlaying(snapshot.playback);

let shortcutSnapshot: PlayerShortcutSnapshot = {
    hasPlayback: false,
    playbackKnown: false,
    isPlaying: false,
    canTogglePlay: false,
    canSetVolume: false,
};

const getShortcutSnapshot = (premiumPlaybackBlocked: boolean) => {
    const next = buildShortcutSnapshot({
        optimisticState: optimisticPlayback.read(),
        playback: snapshot.playback,
        premiumPlaybackBlocked,
    });
    const previous = shortcutSnapshot;
    if (
        previous.hasPlayback === next.hasPlayback &&
        previous.playbackKnown === next.playbackKnown &&
        previous.isPlaying === next.isPlaying &&
        previous.canTogglePlay === next.canTogglePlay &&
        previous.canSetVolume === next.canSetVolume
    ) {
        return previous;
    }
    shortcutSnapshot = next;
    return shortcutSnapshot;
};

const playFromShortcut = async (premiumPlaybackBlocked: boolean) => {
    const shortcut = getShortcutSnapshot(premiumPlaybackBlocked);
    if (!shortcut.canTogglePlay || shortcut.isPlaying) return;
    await resumePlayback(false);
};

const pauseFromShortcut = async (premiumPlaybackBlocked: boolean) => {
    const shortcut = getShortcutSnapshot(premiumPlaybackBlocked);
    if (!shortcut.canTogglePlay || !shortcut.isPlaying) return;
    await pausePlayback(snapshot.progressMs);
};

const toggleMuteFromShortcut = (premiumPlaybackBlocked: boolean) => {
    const shortcut = getShortcutSnapshot(premiumPlaybackBlocked);
    if (!shortcut.canSetVolume) return;

    const { muted, volumePercent } = volumePreview.getDisplayState(
        snapshot.playback?.device?.volume_percent ?? 100
    );
    void volumePreview.commit(
        volumePreview.getToggleVolume(muted, volumePercent)
    );
};

const resumePlayback = async (assumeItemChange = false) => {
    setOptimisticPlayback(true, { assumeItemChange });
    await sendSpotifyMessage('startResumePlayback');
    void sync();
};

const pausePlayback = async (progressMs: number) => {
    setOptimisticPlayback(false);
    setOptimisticProgress(progressMs);
    await sendAndSync('pausePlayback');
};

function setOptimisticPlayback(
    isPlaying: boolean,
    options?: { assumeItemChange?: boolean }
) {
    optimisticPlayback.setPlayback(isPlaying, options);
    progressPrediction.anchorTo(snapshot.progressMs);
}

const sendAndSync = async <N extends SpotifyRpcName>(
    action: N,
    payload?: SpotifyRpcArgs<N>
) => {
    await sendSpotifyMessage(action, payload);
    void sync();
};

export function usePlayer(pollMs = 4000) {
    const premiumPlaybackBlocked = usePremiumPlaybackBlocked();
    useEffect(() => {
        if (pollMs && pollMs !== pollIntervalMs) {
            pollIntervalMs = pollMs;
            if (pollTimer) {
                stopPolling();
                if (subscriberCount > 0) startPolling();
            }
        }
    }, [pollMs]);

    useEffect(() => {
        const handleFocus = () => {
            if (document.visibilityState === 'visible') void sync();
        };
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, []);

    useEffect(() => {
        const handleDispatch = (event: Event) => {
            const detail = (event as CustomEvent<SpotifyRpcDispatchEventDetail>)
                .detail;
            if (!detail) return;

            switch (detail.op) {
                case 'startResumePlayback':
                    setOptimisticPlayback(true);
                    break;
                case 'startPlayback':
                    setOptimisticPlayback(true, { assumeItemChange: true });
                    break;
                case 'pausePlayback':
                    setOptimisticPlayback(false);
                    break;
                case 'seekToPosition': {
                    const ms =
                        typeof detail.args === 'number' ? detail.args : null;
                    if (ms == null || !Number.isFinite(ms)) return;
                    setOptimisticProgress(ms, {
                        assumeControl: true,
                        holdUntilServer: true,
                    });
                    break;
                }
                case 'skipToNext':
                case 'skipToPrevious':
                case 'toggleShuffle':
                case 'setRepeatMode':
                case 'addToQueue':
                case 'syncQueue':
                    optimisticPlayback.applyControl();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener(
            SPOTIFY_RPC_DISPATCH_EVENT,
            handleDispatch as EventListener
        );
        return () => {
            window.removeEventListener(
                SPOTIFY_RPC_DISPATCH_EVENT,
                handleDispatch as EventListener
            );
        };
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const playback = state.playback;
    const progressMs = state.progressMs;
    const durationMs = state.durationMs;
    const optimisticState = optimisticPlayback.read();

    const {
        isPlaying,
        canControl,
        hasPlayback,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canTogglePlay,
        canSetVolume,
    } = getPlaybackCapabilities({
        optimisticState,
        playback,
        premiumPlaybackBlocked,
    });

    const { muted, volumePercent } = volumePreview.getDisplayState(
        playback?.device?.volume_percent ?? 100
    );

    const previewVolume = (v: number) => {
        if (!canSetVolume) return;
        volumePreview.preview(v);
    };

    const setVolume = (v: number) => {
        playbackAnalytics.volumeAdjusted(v);
        if (!canSetVolume) return;
        void volumePreview.commit(v);
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        playbackAnalytics.muteChanged(nextMuted);
        if (!canSetVolume) return;
        void volumePreview.commit(
            volumePreview.getToggleVolume(muted, volumePercent)
        );
    };

    const isShuffle =
        optimisticState?.shuffle ?? playback?.shuffle_state ?? false;
    const shuffleActive = canShuffle ? isShuffle : false;

    const toggleShuffle = () => {
        playbackAnalytics.shuffleChanged(!isShuffle);
        if (!canShuffle) return;
        optimisticPlayback.apply({ shuffle: !isShuffle });
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode =
        optimisticState?.repeatMode ?? playback?.repeat_state ?? 'off';
    const repeatActiveMode = canRepeat ? repeatMode : 'off';
    const pendingItemChange = optimisticPlayback.hasPendingItemChange();

    const toggleRepeat = () => {
        const next = repeatMode === 'off' ? 'context' : 'off';
        playbackAnalytics.repeatChanged(next);
        if (!canRepeat) return;
        optimisticPlayback.apply({ repeatMode: next });
        void sendSpotifyMessage('setRepeatMode', next);
    };

    const controls = {
        play: async () => {
            if (!canTogglePlay) return;
            if (getCurrentIsPlaying()) return;
            playbackAnalytics.playRequested();
            // Resume current playback to preserve queue position + progress.
            await resumePlayback(false);
        },
        pause: () => {
            if (!canTogglePlay) return;
            if (!getCurrentIsPlaying()) return;
            playbackAnalytics.pauseRequested();
            return pausePlayback(progressMs);
        },
        next: () => {
            if (!canSkipNext) return;
            playbackAnalytics.nextRequested();
            return sendAndSync('skipToNext').catch((error) => {
                if (!isNoNextTrackError(error)) throw error;
                return playFallbackAfterNoNext(playback?.item?.uri ?? null);
            });
        },
        previous: () => {
            if (!canSkipPrevious) return;
            playbackAnalytics.previousRequested();
            if (progressMs > 3000) {
                setOptimisticProgress(0);
                return sendAndSync('seekToPosition', 0);
            }
            return sendAndSync('skipToPrevious').catch((error) => {
                if (!isNoPreviousTrackError(error)) throw error;
                setOptimisticProgress(0);
                return sendAndSync('seekToPosition', 0);
            });
        },
        seek: (ms: number) => {
            if (!canSeek) return;
            playbackAnalytics.seekRequested(ms);
            setOptimisticProgress(ms, { holdUntilServer: true });
            return sendAndSync('seekToPosition', ms);
        },
        previewVolume,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
    };

    return {
        playback,
        progressMs,
        durationMs,
        isPlaying,
        volumePercent,
        muted,
        isShuffle: shuffleActive,
        repeatMode: repeatActiveMode,
        hasPlayback,
        canControl,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canSetVolume,
        canTogglePlay,
        pendingItemChange,
        controls,
    };
}

export function usePlayerShortcutState() {
    const premiumPlaybackBlocked = usePremiumPlaybackBlocked();
    return useSyncExternalStore(
        subscribe,
        () => getShortcutSnapshot(premiumPlaybackBlocked),
        () => getShortcutSnapshot(premiumPlaybackBlocked)
    );
}

export function usePlayerShortcutControls() {
    const premiumPlaybackBlocked = usePremiumPlaybackBlocked();
    return useMemo(
        () => ({
            play: () => playFromShortcut(premiumPlaybackBlocked),
            pause: () => pauseFromShortcut(premiumPlaybackBlocked),
            toggleMute: () => toggleMuteFromShortcut(premiumPlaybackBlocked),
        }),
        [premiumPlaybackBlocked]
    );
}
