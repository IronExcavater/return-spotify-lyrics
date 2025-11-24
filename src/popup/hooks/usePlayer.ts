import { useEffect, useState, useCallback, useRef } from 'react';
import { type PlaybackState } from '@spotify/web-api-ts-sdk';

import { Msg } from '../../shared/messaging';

export function usePlayer() {
    const [playback, setPlayback] = useState<PlaybackState | null>(null);
    const lastUpdate = useRef<number | null>(null);

    const sync = useCallback(() => {
        chrome.runtime.sendMessage({ type: Msg.GET_PLAYER }, (resp) => {
            setPlayback(resp);
            lastUpdate.current = Date.now();
        });
    }, []);

    /** Player controls */
    const play = () => chrome.runtime.sendMessage({ type: Msg.PLAYER_PLAY });

    const pause = () => chrome.runtime.sendMessage({ type: Msg.PLAYER_PAUSE });

    const next = () => chrome.runtime.sendMessage({ type: Msg.PLAYER_NEXT });

    const previous = () =>
        chrome.runtime.sendMessage({ type: Msg.PLAYER_PREVIOUS });

    const seek = (positionMs: number) =>
        chrome.runtime.sendMessage({ type: Msg.PLAYER_SEEK, positionMs });

    const shuffle = () =>
        chrome.runtime.sendMessage({ type: Msg.PLAYER_SHUFFLE });

    /** Sync playback every 3 seconds */
    useEffect(() => {
        sync();
        const id = setInterval(sync, 3000);
        return () => clearInterval(id);
    }, [sync]);

    /* Interpolate playback between syncs */
    useEffect(() => {
        const timer = setInterval(() => {
            setPlayback((prev) => {
                // only increment if playing
                if (!prev || !prev.is_playing) return prev;

                const now = Date.now();
                if (!lastUpdate.current) lastUpdate.current = now;

                const delta = now - lastUpdate.current;
                const newProgress = prev.progress_ms + delta;
                lastUpdate.current = now;

                return {
                    ...prev,
                    progress_ms: newProgress,
                };
            });
        }, 950);

        return () => clearInterval(timer);
    }, []);

    return {
        playback,
        play,
        pause,
        next,
        previous,
        seek,
        shuffle,
    };
}
