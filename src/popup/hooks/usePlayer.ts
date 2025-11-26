import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackState } from '@spotify/web-api-ts-sdk';
import { sendSpotifyMessage } from '../../shared/messaging';

export function usePlayer() {
    const [playback, setPlayback] = useState<PlaybackState | null>(null);
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
        const timer = setInterval(sync, 5000);
        return () => clearInterval(timer);
    }, [sync]);

    return {
        playback,

        // ----- Player controls -----
        play: () => sendSpotifyMessage('startResumePlayback').then(sync),

        pause: () => sendSpotifyMessage('pausePlayback').then(sync),

        next: () => sendSpotifyMessage('skipToNext').then(sync),

        previous: () => sendSpotifyMessage('skipToPrevious').then(sync),

        seek: (ms: number) =>
            sendSpotifyMessage('seekToPosition', ms).then(sync),

        shuffle: (state: boolean) =>
            sendSpotifyMessage('toggleShuffle', state).then(sync),

        repeat: (mode: 'off' | 'track' | 'context') =>
            sendSpotifyMessage('setRepeatMode', mode).then(sync),

        setVolume: (volume: number) =>
            sendSpotifyMessage('setPlaybackVolume', volume).then(sync),

        // ----- Queue -----
        addToQueue: (uri: string) =>
            sendSpotifyMessage('addToQueue', uri).then(sync),

        // ----- Library -----
        saveTrack: (ids: string[]) =>
            sendSpotifyMessage('saveTracks', ids).then(sync),

        unsaveTrack: (ids: string[]) =>
            sendSpotifyMessage('unsaveTracks', ids).then(sync),

        isTrackSaved: (ids: string[]) =>
            sendSpotifyMessage('hasSavedTracks', ids),

        // ----- Device switching -----
        listDevices: () => sendSpotifyMessage('getAvailableDevices'),

        transferToDevice: (deviceId: string) =>
            sendSpotifyMessage('transferPlayback', { deviceId }),
    };
}
