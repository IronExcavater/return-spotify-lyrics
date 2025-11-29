import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import { sendSpotifyMessage } from '../../shared/messaging';

export function usePlayer(pollMs?: number) {
    const [playback, setPlayback] = useState<PlaybackState | null | undefined>(
        undefined
    );
    const lastUpdate = useRef<number | null>(null);

    // Sync playback state
    const sync = useCallback(async () => {
        const state = await sendSpotifyMessage('getPlaybackState');
        setPlayback(state ?? null);
        lastUpdate.current = Date.now();
    }, []);

    // Auto-sync every 5 seconds
    useEffect(() => {
        void sync();
        if (!pollMs) return;

        const timer = setInterval(sync, pollMs);
        return () => clearInterval(timer);
    }, [sync, pollMs]);

    const isPlaying = playback?.is_playing ?? false;
    const durationMs = playback?.item?.duration_ms ?? 0;
    const progressMs = playback?.progress_ms ?? 0;

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

    const controls = {
        play: () => sendSpotifyMessage('startResumePlayback'),
        pause: () => sendSpotifyMessage('pausePlayback'),
        next: () => sendSpotifyMessage('skipToNext'),
        previous: () => sendSpotifyMessage('skipToPrevious'),
        seek: (ms: number) => sendSpotifyMessage('seekToPosition', ms),
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
