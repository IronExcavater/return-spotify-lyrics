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

    const controls = {
        play: () => sendSpotifyMessage('startResumePlayback'),
        pause: () => sendSpotifyMessage('pausePlayback'),
        next: () => sendSpotifyMessage('skipToNext'),
        previous: () => sendSpotifyMessage('skipToPrevious'),
        seek: (ms: number) => sendSpotifyMessage('seekToPosition', ms),
        shuffle: (state: boolean) => sendSpotifyMessage('toggleShuffle', state),
        repeat: (mode: 'off' | 'track' | 'context') =>
            sendSpotifyMessage('setRepeatMode', mode),
        setVolume: (volume: number) =>
            sendSpotifyMessage('setPlaybackVolume', volume),
    };

    return {
        playback,
        controls,
    };
}
