import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import { sendSpotifyMessage } from '../../shared/messaging';

export function usePlayer(pollMs = 4000) {
    const [playback, setPlayback] = useState<PlaybackState | null | undefined>(
        undefined
    );
    const [progressMs, setProgressMs] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const baseProgress = useRef(0);
    const lastSyncRef = useRef<number | null>(null);
    const pendingEndSync = useRef(false);
    const trackPlayback = useMemo(() => createAnalyticsTracker('playback'), []);

    // Sync playback state
    const sync = useCallback(async () => {
        const state = await sendSpotifyMessage('getPlaybackState');
        setPlayback(state ?? null);
        const latestProgress = state?.progress_ms ?? 0;
        baseProgress.current = latestProgress;
        lastSyncRef.current = Date.now();
        setProgressMs(latestProgress);
        setDurationMs(state?.item?.duration_ms ?? 0);
    }, []);

    // Auto-sync every 5 seconds
    useEffect(() => {
        void sync();
        if (!pollMs) return;

        const timer = setInterval(sync, pollMs);
        return () => clearInterval(timer);
    }, [sync, pollMs]);

    const isPlaying = playback?.is_playing ?? false;
    const lastPlayState = useRef<boolean | null>(null);

    useEffect(() => {
        if (playback == null) return;
        if (lastPlayState.current === isPlaying) return;
        lastPlayState.current = isPlaying;
        void trackPlayback(ANALYTICS_EVENTS.playbackState, {
            reason: 'playback state synced',
            data: { playing: isPlaying },
        });
    }, [isPlaying, playback, trackPlayback]);

    useEffect(() => {
        const latestProgress = playback?.progress_ms ?? 0;
        baseProgress.current = latestProgress;
        lastSyncRef.current = Date.now();
        setProgressMs(latestProgress);
        setDurationMs(playback?.item?.duration_ms ?? 0);
    }, [playback?.progress_ms, playback?.item?.id]);

    useEffect(() => {
        let frame: number;
        const tick = () => {
            if (durationMs > 0) {
                const elapsed =
                    isPlaying && lastSyncRef.current
                        ? Date.now() - lastSyncRef.current
                        : 0;
                const next = Math.min(
                    durationMs,
                    baseProgress.current + elapsed
                );
                setProgressMs((prev) =>
                    Math.abs(prev - next) > 16 ? next : prev
                );
            }
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [durationMs, isPlaying]);

    useEffect(() => {
        if (!isPlaying || durationMs <= 0) {
            pendingEndSync.current = false;
            return;
        }

        const remaining = durationMs - progressMs;
        if (remaining <= 400 && !pendingEndSync.current) {
            pendingEndSync.current = true;
            void sync().finally(() => {
                pendingEndSync.current = false;
            });
        } else if (remaining > 1000) {
            pendingEndSync.current = false;
        }
    }, [durationMs, progressMs, isPlaying, sync]);

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
        [sync]
    );

    const controls = {
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
    };

    const lastItemRef = useRef<string | null>(null);

    useEffect(() => {
        const item = playback?.item;
        if (!item) return;
        const itemId = item.id ?? item.uri ?? null;
        if (!itemId || lastItemRef.current === itemId) return;
        lastItemRef.current = itemId;

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
    }, [playback?.item, trackPlayback]);

    return {
        playback,
        isPlaying,
        durationMs,
        progressMs,
        volumePercent,
        muted,
        isShuffle,
        repeatMode,
        controls,
    };
}
