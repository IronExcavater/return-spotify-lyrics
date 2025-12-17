import { getSpotifySdk } from './spotifyAuth.ts';

export const spotifyRpc = {
    currentUser: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.currentUser.profile();
    },

    getPlaybackState: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.getPlaybackState();
    },
    pausePlayback: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.pausePlayback('');
    },
    startResumePlayback: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.startResumePlayback('');
    },
    seekToPosition: async (positionMs: number) => {
        const sdk = await getSpotifySdk();
        return sdk?.player.seekToPosition(positionMs);
    },
    skipToNext: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.skipToNext('');
    },
    skipToPrevious: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.skipToPrevious('');
    },
    toggleShuffle: async (state: boolean) => {
        const sdk = await getSpotifySdk();
        return sdk?.player.togglePlaybackShuffle(state);
    },
    setRepeatMode: async (mode: 'off' | 'track' | 'context') => {
        const sdk = await getSpotifySdk();
        return sdk?.player.setRepeatMode(mode);
    },
    setPlaybackVolume: async (volume: number) => {
        const sdk = await getSpotifySdk();
        return sdk?.player.setPlaybackVolume(volume);
    },
    getAvailableDevices: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.getAvailableDevices();
    },
    transferPlayback: async ({ deviceId }: { deviceId: string }) => {
        const sdk = await getSpotifySdk();
        return sdk?.player.transferPlayback([deviceId], true);
    },

    getQueue: async () => {
        const sdk = await getSpotifySdk();
        return sdk?.player.getUsersQueue();
    },
    addToQueue: async (uri: string) => {
        const sdk = await getSpotifySdk();
        return sdk?.player.addItemToPlaybackQueue(uri);
    },

    saveTracks: async (ids: string[]) => {
        const sdk = await getSpotifySdk();
        return sdk?.currentUser.tracks.saveTracks(ids);
    },
    unsaveTracks: async (ids: string[]) => {
        const sdk = await getSpotifySdk();
        return sdk?.currentUser.tracks.removeSavedTracks(ids);
    },
    hasSavedTracks: async (ids: string[]) => {
        const sdk = await getSpotifySdk();
        return sdk?.currentUser.tracks.hasSavedTracks(ids);
    },
} as const;

export type SpotifyRpc = typeof spotifyRpc;
export type SpotifyRpcName = keyof SpotifyRpc;
export type SpotifyRpcArgs<N extends SpotifyRpcName> = Parameters<
    SpotifyRpc[N]
>[0];
export type SpotifyRpcReturn<N extends SpotifyRpcName> = Awaited<
    ReturnType<SpotifyRpc[N]>
>;
