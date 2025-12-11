import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
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
        void sendSpotifyMessage('setPlaybackVolume', v);
    };

    const toggleMute = () => {
        if (muted)
            void sendSpotifyMessage(
                'setPlaybackVolume',
                lastNonZero.current || 50
            );
        else void sendSpotifyMessage('setPlaybackVolume', 0);
    };

    const isShuffle = playback?.shuffle_state ?? false;

    const toggleShuffle = () => {
        void sendSpotifyMessage('toggleShuffle', !isShuffle);
    };

    const repeatMode = playback?.repeat_state ?? 'off';

    const toggleRepeat = () => {
        void sendSpotifyMessage(
            'setRepeatMode',
            repeatMode === 'off' ? 'context' : 'off'
        );
    };

    const refreshAfter = useCallback(
        async (action: string, payload?: number | boolean) => {
            await sendSpotifyMessage(action as any, payload as any);
            void sync();
        },
        [sync]
    );

    const controls = {
        play: () => refreshAfter('startResumePlayback'),
        pause: () => refreshAfter('pausePlayback'),
        next: () => refreshAfter('skipToNext'),
        previous: () => refreshAfter('skipToPrevious'),
        seek: (ms: number) => refreshAfter('seekToPosition', ms),
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
    };

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
