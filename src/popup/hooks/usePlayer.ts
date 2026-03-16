import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
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
import { sendSpotifyMessage } from '../../shared/messaging';
import { useSpotifyRead } from './useSpotifyRead';

type OptimisticState = {
    isPlaying?: boolean;
    shuffle?: boolean;
    repeatMode?: 'off' | 'track' | 'context';
    volumePercent?: number;
    progressMs?: number;
    expiresAt: number;
};

const trackPlayback = createAnalyticsTracker('playback');

let optimisticState: OptimisticState | null = null;
let optimisticTimer: ReturnType<typeof setTimeout> | null = null;
const optimisticListeners = new Set<() => void>();
let lastPlayState: boolean | null = null;
let lastItemId: string | null = null;

const emitOptimistic = () => {
    optimisticListeners.forEach((listener) => listener());
};

const applyOptimistic = (
    patch: Omit<OptimisticState, 'expiresAt'>,
    ttlMs = 12_000
) => {
    if (optimisticTimer) clearTimeout(optimisticTimer);
    optimisticState = {
        ...(optimisticState ?? {}),
        ...patch,
        expiresAt: Date.now() + ttlMs,
    };
    optimisticTimer = setTimeout(() => {
        optimisticTimer = null;
        optimisticState = null;
        emitOptimistic();
    }, ttlMs);
    emitOptimistic();
};

const subscribeOptimistic = (listener: () => void) => {
    optimisticListeners.add(listener);
    return () => optimisticListeners.delete(listener);
};

const getOptimisticSnapshot = () => {
    if (optimisticState && optimisticState.expiresAt <= Date.now()) {
        optimisticState = null;
    }
    return optimisticState;
};

const getNextPlayerRefreshMs = (playback: PlaybackState | null | undefined) => {
    if (document.visibilityState !== 'visible') return 30_000;
    if (!playback) return 20_000;
    return playback.is_playing ? 10_000 : 25_000;
};

export function usePlayer() {
    const optimistic = useSyncExternalStore(
        subscribeOptimistic,
        getOptimisticSnapshot,
        getOptimisticSnapshot
    );

    const playbackState = useSpotifyRead<PlaybackState | null>({
        key: 'player/current',
        staleMs: 2_000,
        cacheMs: 60_000,
        refreshOnFocus: true,
        load: async () =>
            (await sendSpotifyMessage('getPlaybackState')) ?? null,
        getNextRefreshMs: (snapshot) =>
            getNextPlayerRefreshMs(snapshot.data ?? null),
    });
    const refreshPlayback = playbackState.refresh;

    const playback = playbackState.data ?? null;
    const [progressMs, setProgressMs] = useState(playback?.progress_ms ?? 0);
    const baseProgressRef = useRef(playback?.progress_ms ?? 0);
    const lastSyncRef = useRef<number | null>(null);
    const pendingEndSyncRef = useRef(false);

    useEffect(() => {
        if (!playback) {
            baseProgressRef.current = 0;
            lastSyncRef.current = null;
            setProgressMs(0);
            return;
        }

        baseProgressRef.current =
            optimistic?.progressMs ?? playback.progress_ms ?? 0;
        lastSyncRef.current = Date.now();
        setProgressMs(baseProgressRef.current);
    }, [optimistic?.progressMs, playback?.item?.id, playback?.progress_ms]);

    useEffect(() => {
        const isPlaying = playback?.is_playing ?? false;
        if (lastPlayState !== isPlaying) {
            lastPlayState = isPlaying;
            void trackPlayback(ANALYTICS_EVENTS.playbackState, {
                reason: 'playback state synced',
                data: { playing: isPlaying },
            });
        }

        const item = playback?.item;
        if (!item) return;
        const itemId = item.id ?? item.uri ?? null;
        if (!itemId || lastItemId === itemId) return;

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
    }, [playback]);

    useEffect(() => {
        let rafId: number | null = null;

        const tick = () => {
            const durationMs = playback?.item?.duration_ms ?? 0;
            const isPlaying =
                optimistic?.isPlaying ?? playback?.is_playing ?? false;

            if (durationMs > 0) {
                const elapsed =
                    isPlaying && lastSyncRef.current
                        ? Date.now() - lastSyncRef.current
                        : 0;
                const next = Math.min(
                    durationMs,
                    baseProgressRef.current + elapsed
                );
                setProgressMs((current) =>
                    Math.abs(current - next) > 16 ? next : current
                );

                if (isPlaying && !pendingEndSyncRef.current) {
                    const remaining = durationMs - next;
                    if (remaining <= 400) {
                        pendingEndSyncRef.current = true;
                        void refreshPlayback(true).finally(() => {
                            pendingEndSyncRef.current = false;
                        });
                    }
                }
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId != null) cancelAnimationFrame(rafId);
            pendingEndSyncRef.current = false;
        };
    }, [optimistic?.isPlaying, playback, refreshPlayback]);

    const isPlaying = optimistic?.isPlaying ?? playback?.is_playing ?? false;
    const durationMs = playback?.item?.duration_ms ?? 0;
    const volumePercent =
        optimistic?.volumePercent ?? playback?.device?.volume_percent ?? 100;
    const muted = volumePercent === 0;
    const lastNonZero = useRef(volumePercent || 50);
    if (!muted) lastNonZero.current = volumePercent;

    const device = playback?.device;
    const disallows = (
        playback?.actions as { disallows?: Record<string, boolean> } | undefined
    )?.disallows;
    const canControl = device?.is_restricted !== true;
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

    const refreshAfter = useCallback(
        async <N extends SpotifyRpcName>(
            action: N,
            payload?: SpotifyRpcArgs<N>
        ) => {
            await sendSpotifyMessage(action, payload);
            await refreshPlayback(true);
        },
        [refreshPlayback]
    );

    const setVolume = (nextVolume: number) => {
        void trackPlayback(ANALYTICS_EVENTS.playbackVolume, {
            reason: 'volume adjusted',
            data: { volume: nextVolume },
        });
        if (!canSetVolume) return;
        applyOptimistic({ volumePercent: nextVolume }, 12_000);
        void sendSpotifyMessage('setPlaybackVolume', nextVolume);
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        void trackPlayback(ANALYTICS_EVENTS.playbackMute, {
            reason: nextMuted ? 'muted playback' : 'unmuted playback',
            data: { muted: nextMuted },
        });
        if (!canSetVolume) return;
        if (muted) {
            const nextVolume = lastNonZero.current || 50;
            applyOptimistic({ volumePercent: nextVolume }, 12_000);
            void sendSpotifyMessage('setPlaybackVolume', nextVolume);
            return;
        }
        applyOptimistic({ volumePercent: 0 }, 12_000);
        void sendSpotifyMessage('setPlaybackVolume', 0);
    };

    const isShuffle = optimistic?.shuffle ?? playback?.shuffle_state ?? false;
    const shuffleActive = canShuffle ? isShuffle : false;

    const toggleShuffle = () => {
        void trackPlayback(ANALYTICS_EVENTS.playbackShuffle, {
            reason: 'shuffle toggled',
            data: { enabled: !isShuffle },
        });
        if (!canShuffle) return;
        applyOptimistic({ shuffle: !isShuffle }, 12_000);
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode =
        optimistic?.repeatMode ?? playback?.repeat_state ?? 'off';
    const repeatActiveMode = canRepeat ? repeatMode : 'off';

    const toggleRepeat = () => {
        const next = repeatMode === 'off' ? 'context' : 'off';
        void trackPlayback(ANALYTICS_EVENTS.playbackRepeat, {
            reason: 'repeat toggled',
            data: { mode: next },
        });
        if (!canRepeat) return;
        applyOptimistic({ repeatMode: next }, 12_000);
        void sendSpotifyMessage('setRepeatMode', next);
    };

    const controls = useMemo(
        () => ({
            play: async () => {
                if (!canTogglePlay) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackPlay, {
                    reason: 'playback resumed',
                });
                applyOptimistic({ isPlaying: true }, 12_000);
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
                await refreshPlayback(true);
            },
            pause: () => {
                if (!canTogglePlay) return;
                void trackPlayback(ANALYTICS_EVENTS.playbackPause, {
                    reason: 'playback paused',
                });
                applyOptimistic({ isPlaying: false }, 12_000);
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
                applyOptimistic({ progressMs: ms }, 12_000);
                baseProgressRef.current = ms;
                lastSyncRef.current = Date.now();
                setProgressMs(ms);
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
            refreshPlayback,
            refreshAfter,
            setVolume,
            toggleMute,
            toggleShuffle,
            toggleRepeat,
        ]
    );

    return {
        playback,
        progressMs: optimistic?.progressMs ?? progressMs,
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
