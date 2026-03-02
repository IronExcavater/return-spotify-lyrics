import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import type {
    SpotifyRpcArgs,
    SpotifyRpcName,
} from '../../background/spotifyRpc';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import {
    sendSpotifyMessage,
    SPOTIFY_RPC_DISPATCH_EVENT,
    type SpotifyRpcDispatchEventDetail,
} from '../../shared/messaging';

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

type OptimisticState = {
    isPlaying?: boolean;
    shuffle?: boolean;
    repeatMode?: 'off' | 'track' | 'context';
    volumePercent?: number;
    progressMs?: number;
    assumeCanControl?: boolean;
    expiresAt: number;
};

let optimisticState: OptimisticState | null = null;

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let rafId: number | null = null;
let subscriberCount = 0;
let pollIntervalMs = 4000;

const baseProgress = { current: 0 };
const lastSyncRef = { current: null as number | null };
const pendingEndSync = { current: false };

const trackPlayback = createAnalyticsTracker('playback');
let lastPlayState: boolean | null = null;
let lastItemId: string | null = null;

const emit = () => {
    listeners.forEach((listener) => listener());
};

const setSnapshot = (next: Partial<PlayerSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
};

const applyOptimistic = (patch: Omit<OptimisticState, 'expiresAt'>) => {
    optimisticState = {
        ...(optimisticState ?? {}),
        ...patch,
        expiresAt: Date.now() + pollIntervalMs,
    };
    emit();
};

const sync = async () => {
    const state = await sendSpotifyMessage('getPlaybackState');
    optimisticState = null;
    setSnapshot({ playback: state ?? null });
    const latestProgress = state?.progress_ms ?? 0;
    baseProgress.current = latestProgress;
    lastSyncRef.current = Date.now();
    setSnapshot({
        progressMs: latestProgress,
        durationMs: state?.item?.duration_ms ?? 0,
    });

    const isPlaying = state?.is_playing ?? false;
    if (lastPlayState !== isPlaying) {
        lastPlayState = isPlaying;
        void trackPlayback(ANALYTICS_EVENTS.playbackState, {
            reason: 'playback state synced',
            data: { playing: isPlaying },
        });
    }

    const item = state?.item;
    if (item) {
        const itemId = item.id ?? item.uri ?? null;
        if (itemId && lastItemId !== itemId) {
            lastItemId = itemId;
            const artists = 'artists' in item ? item.artists : undefined;
            const show = 'show' in item ? item.show : undefined;
            const names = artists?.map((artist) => artist.name) ?? [];
            if (!names.length && show?.name) names.push(show.name);
            void trackPlayback(ANALYTICS_EVENTS.playbackItem, {
                reason: 'playback item changed',
                data: {
                    id: itemId,
                    name: item.name,
                    type: item.type,
                    artists: names,
                },
            });
        }
    }
};

const tick = () => {
    const playback = snapshot.playback;
    const durationMs = snapshot.durationMs;
    const isPlaying =
        optimisticState?.isPlaying ?? playback?.is_playing ?? false;

    if (durationMs > 0) {
        const elapsed =
            isPlaying && lastSyncRef.current
                ? Date.now() - lastSyncRef.current
                : 0;
        const next = Math.min(durationMs, baseProgress.current + elapsed);
        setSnapshot({
            progressMs:
                Math.abs(snapshot.progressMs - next) > 16
                    ? next
                    : snapshot.progressMs,
        });

        if (isPlaying && !pendingEndSync.current) {
            const remaining = durationMs - next;
            if (remaining <= 400) {
                pendingEndSync.current = true;
                void sync().finally(() => {
                    pendingEndSync.current = false;
                });
            }
        }
    }

    if (optimisticState && optimisticState.expiresAt <= Date.now()) {
        optimisticState = null;
        emit();
    }

    rafId = requestAnimationFrame(tick);
};

const startPolling = () => {
    if (pollTimer) return;
    void sync();
    pollTimer = setInterval(sync, pollIntervalMs);
    rafId = requestAnimationFrame(tick);
};

const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    if (rafId) cancelAnimationFrame(rafId);
    pollTimer = null;
    rafId = null;
    pendingEndSync.current = false;
    lastSyncRef.current = null;
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

export function usePlayer(pollMs = 4000) {
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
                case 'startPlayback':
                    applyOptimistic({
                        isPlaying: true,
                        assumeCanControl: true,
                    });
                    baseProgress.current = snapshot.progressMs;
                    lastSyncRef.current = Date.now();
                    break;
                case 'pausePlayback':
                    applyOptimistic({
                        isPlaying: false,
                        assumeCanControl: true,
                    });
                    baseProgress.current = snapshot.progressMs;
                    lastSyncRef.current = Date.now();
                    break;
                case 'seekToPosition': {
                    const ms =
                        typeof detail.args === 'number' ? detail.args : null;
                    if (ms == null || !Number.isFinite(ms)) return;
                    applyOptimistic({
                        progressMs: ms,
                        assumeCanControl: true,
                    });
                    baseProgress.current = ms;
                    lastSyncRef.current = Date.now();
                    setSnapshot({ progressMs: ms });
                    break;
                }
                case 'setPlaybackVolume': {
                    const volume =
                        typeof detail.args === 'number' ? detail.args : null;
                    if (volume == null || !Number.isFinite(volume)) return;
                    applyOptimistic({
                        volumePercent: volume,
                        assumeCanControl: true,
                    });
                    break;
                }
                case 'skipToNext':
                case 'skipToPrevious':
                case 'toggleShuffle':
                case 'setRepeatMode':
                case 'addToQueue':
                    applyOptimistic({ assumeCanControl: true });
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
    const progressMs = optimisticState?.progressMs ?? state.progressMs;
    const durationMs = state.durationMs;

    const isPlaying =
        optimisticState?.isPlaying ?? playback?.is_playing ?? false;

    const volumePercent =
        optimisticState?.volumePercent ??
        playback?.device?.volume_percent ??
        100;
    const muted = volumePercent === 0;
    const lastNonZero = useRef(volumePercent || 50);
    if (!muted) lastNonZero.current = volumePercent;

    const device = playback?.device;
    const disallows = (
        playback?.actions as { disallows?: Record<string, boolean> } | undefined
    )?.disallows;
    const canControl =
        device?.is_restricted !== true ||
        optimisticState?.assumeCanControl === true;
    const canSeek = canControl && disallows?.seeking !== true;
    const canSkipNext = canControl && disallows?.skipping_next !== true;
    const canSkipPrevious = canControl && disallows?.skipping_prev !== true;
    const canShuffle = canControl && disallows?.toggling_shuffle !== true;
    const canRepeat =
        canControl &&
        disallows?.toggling_repeat_context !== true &&
        disallows?.toggling_repeat_track !== true;
    const canResume = canControl && disallows?.resuming !== true;
    const canPause = canControl && disallows?.pausing !== true;
    const canTogglePlay = isPlaying ? canPause : canResume;
    const supportsVolume =
        device && 'supports_volume' in device
            ? (device as { supports_volume?: boolean }).supports_volume !==
              false
            : true;
    const canSetVolume =
        canControl && supportsVolume && disallows?.setting_volume !== true;

    const setVolume = (v: number) => {
        void trackPlayback(ANALYTICS_EVENTS.playbackVolume, {
            reason: 'volume adjusted',
            data: { volume: v },
        });
        if (!canSetVolume) return;
        applyOptimistic({ volumePercent: v });
        void sendSpotifyMessage('setPlaybackVolume', v);
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        void trackPlayback(ANALYTICS_EVENTS.playbackMute, {
            reason: nextMuted ? 'muted playback' : 'unmuted playback',
            data: { muted: nextMuted },
        });
        if (!canSetVolume) return;
        if (muted) {
            applyOptimistic({
                volumePercent: lastNonZero.current || 50,
            });
            void sendSpotifyMessage(
                'setPlaybackVolume',
                lastNonZero.current || 50
            );
        } else {
            applyOptimistic({ volumePercent: 0 });
            void sendSpotifyMessage('setPlaybackVolume', 0);
        }
    };

    const isShuffle =
        optimisticState?.shuffle ?? playback?.shuffle_state ?? false;
    const shuffleActive = canShuffle ? isShuffle : false;

    const toggleShuffle = () => {
        void trackPlayback(ANALYTICS_EVENTS.playbackShuffle, {
            reason: 'shuffle toggled',
            data: { enabled: !isShuffle },
        });
        if (!canShuffle) return;
        applyOptimistic({ shuffle: !isShuffle });
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode =
        optimisticState?.repeatMode ?? playback?.repeat_state ?? 'off';
    const repeatActiveMode = canRepeat ? repeatMode : 'off';

    const toggleRepeat = () => {
        const next = repeatMode === 'off' ? 'context' : 'off';
        void trackPlayback(ANALYTICS_EVENTS.playbackRepeat, {
            reason: 'repeat toggled',
            data: { mode: next },
        });
        if (!canRepeat) return;
        applyOptimistic({ repeatMode: next });
        void sendSpotifyMessage('setRepeatMode', next);
    };

    const refreshAfter = useCallback(
        async <N extends SpotifyRpcName>(
            action: N,
            payload?: SpotifyRpcArgs<N>
        ) => {
            await sendSpotifyMessage(action, payload);
            void sync();
        },
        []
    );

    const controls = useMemo(
        () => ({
            play: async () => {
                if (!canTogglePlay) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackPlay, {
                    reason: 'playback resumed',
                });
                applyOptimistic({
                    isPlaying: true,
                    assumeCanControl: true,
                });
                baseProgress.current = progressMs;
                lastSyncRef.current = Date.now();
                const contextUri = playback?.context?.uri;
                const uri = playback?.item?.uri;
                const positionMs = playback?.progress_ms ?? 0;

                if (contextUri || uri) {
                    await sendSpotifyMessage('startPlayback', {
                        contextUri: contextUri ?? undefined,
                        uris: contextUri ? undefined : uri ? [uri] : undefined,
                        positionMs,
                    });
                } else {
                    await sendSpotifyMessage('startResumePlayback');
                }
                void sync();
            },
            pause: () => {
                if (!canTogglePlay) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackPause, {
                    reason: 'playback paused',
                });
                applyOptimistic({
                    isPlaying: false,
                    assumeCanControl: true,
                });
                baseProgress.current = progressMs;
                lastSyncRef.current = Date.now();
                setSnapshot({ progressMs });
                return refreshAfter('pausePlayback');
            },
            next: () => {
                if (!canSkipNext) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackNext, {
                    reason: 'skipped to next',
                });
                return refreshAfter('skipToNext');
            },
            previous: () => {
                if (!canSkipPrevious) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackPrevious, {
                    reason: 'skipped to previous',
                });
                return refreshAfter('skipToPrevious');
            },
            seek: (ms: number) => {
                if (!canSeek) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackSeek, {
                    reason: 'scrubbed playback',
                    data: { positionMs: ms },
                });
                applyOptimistic({ progressMs: ms });
                baseProgress.current = ms;
                lastSyncRef.current = Date.now();
                setSnapshot({ progressMs: ms });
                return refreshAfter('seekToPosition', ms);
            },
            setVolume,
            toggleMute,
            toggleShuffle,
            toggleRepeat,
        }),
        [
            canSeek,
            canSkipNext,
            canSkipPrevious,
            canTogglePlay,
            playback,
            progressMs,
            refreshAfter,
            setVolume,
            toggleMute,
            toggleShuffle,
            toggleRepeat,
        ]
    );

    return {
        playback,
        progressMs,
        durationMs,
        isPlaying,
        volumePercent,
        muted,
        isShuffle: shuffleActive,
        repeatMode: repeatActiveMode,
        canControl,
        canSeek,
        canSkipNext,
        canSkipPrevious,
        canShuffle,
        canRepeat,
        canSetVolume,
        canTogglePlay,
        controls,
    };
}
