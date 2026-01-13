import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import { sendSpotifyMessage } from '../../shared/messaging';

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

const sync = async () => {
    const state = await sendSpotifyMessage('getPlaybackState');
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
    const isPlaying = playback?.is_playing ?? false;

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

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const playback = state.playback;
    const progressMs = state.progressMs;
    const durationMs = state.durationMs;

    const volumePercent = playback?.device?.volume_percent ?? 100;
    const muted = volumePercent === 0;
    const lastNonZero = useRef(volumePercent || 50);
    if (!muted) lastNonZero.current = volumePercent;

    const setVolume = (v: number) => {
        void trackPlayback(ANALYTICS_EVENTS.playbackVolume, {
            reason: 'volume adjusted',
            data: { volume: v },
        });
        void sendSpotifyMessage('setPlaybackVolume', v);
    };

    const toggleMute = () => {
        const nextMuted = !muted;
        void trackPlayback(ANALYTICS_EVENTS.playbackMute, {
            reason: nextMuted ? 'muted playback' : 'unmuted playback',
            data: { muted: nextMuted },
        });
        if (muted)
            void sendSpotifyMessage(
                'setPlaybackVolume',
                lastNonZero.current || 50
            );
        else void sendSpotifyMessage('setPlaybackVolume', 0);
    };

    const isShuffle = playback?.shuffle_state ?? false;

    const toggleShuffle = () => {
        void trackPlayback(ANALYTICS_EVENTS.playbackShuffle, {
            reason: 'shuffle toggled',
            data: { enabled: !isShuffle },
        });
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode = playback?.repeat_state ?? 'off';

    const toggleRepeat = () => {
        const next = repeatMode === 'off' ? 'context' : 'off';
        void trackPlayback(ANALYTICS_EVENTS.playbackRepeat, {
            reason: 'repeat toggled',
            data: { mode: next },
        });
        void sendSpotifyMessage('setRepeatMode', next);
    };

    const refreshAfter = useCallback(
        async (action: string, payload?: number | boolean) => {
            await sendSpotifyMessage(action as any, payload as any);
            void sync();
        },
        []
    );

    const controls = useMemo(
        () => ({
            play: () => {
                void trackPlayback(ANALYTICS_EVENTS.playbackPlay, {
                    reason: 'playback resumed',
                });
                return refreshAfter('startResumePlayback');
            },
            pause: () => {
                void trackPlayback(ANALYTICS_EVENTS.playbackPause, {
                    reason: 'playback paused',
                });
                return refreshAfter('pausePlayback');
            },
            next: () => {
                void trackPlayback(ANALYTICS_EVENTS.playbackNext, {
                    reason: 'skipped to next',
                });
                return refreshAfter('skipToNext');
            },
            previous: () => {
                void trackPlayback(ANALYTICS_EVENTS.playbackPrevious, {
                    reason: 'skipped to previous',
                });
                return refreshAfter('skipToPrevious');
            },
            seek: (ms: number) => {
                void trackPlayback(ANALYTICS_EVENTS.playbackSeek, {
                    reason: 'scrubbed playback',
                    data: { positionMs: ms },
                });
                return refreshAfter('seekToPosition', ms);
            },
            setVolume,
            toggleMute,
            toggleShuffle,
            toggleRepeat,
        }),
        [refreshAfter, setVolume, toggleMute, toggleShuffle, toggleRepeat]
    );

    return {
        playback,
        progressMs,
        durationMs,
        isPlaying: playback?.is_playing ?? false,
        volumePercent,
        muted,
        isShuffle,
        repeatMode,
        controls,
    };
}
