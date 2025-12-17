import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import {
    SPOTIFY_REDIRECT,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_SCOPES,
} from '../shared/config.ts';

export const spotifyClient = SpotifyApi.withUserAuthorization(
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT,
    SPOTIFY_SCOPES
);

export const spotifyRpc = {
    currentUser: async () => {
        return spotifyClient.currentUser.profile();
    },

    getPlaybackState: async () => {
        return spotifyClient.player.getPlaybackState();
    },
    pausePlayback: async () => {
        return spotifyClient.player.pausePlayback('');
    },
    startResumePlayback: async () => {
        return spotifyClient.player.startResumePlayback('');
    },
    seekToPosition: async (positionMs: number) => {
        return spotifyClient.player.seekToPosition(positionMs);
    },
    skipToNext: async () => {
        return spotifyClient.player.skipToNext('');
    },
    skipToPrevious: async () => {
        return spotifyClient.player.skipToPrevious('');
    },
    toggleShuffle: async (state: boolean) => {
        return spotifyClient.player.togglePlaybackShuffle(state);
    },
    setRepeatMode: async (mode: 'off' | 'track' | 'context') => {
        return spotifyClient.player.setRepeatMode(mode);
    },
    setPlaybackVolume: async (volume: number) => {
        return spotifyClient.player.setPlaybackVolume(volume);
    },
    getAvailableDevices: async () => {
        return spotifyClient.player.getAvailableDevices();
    },
    transferPlayback: async ({ deviceId }: { deviceId: string }) => {
        return spotifyClient.player.transferPlayback([deviceId], true);
    },

    getQueue: async () => {
        return spotifyClient.player.getUsersQueue();
    },
    addToQueue: async (uri: string) => {
        return spotifyClient.player.addItemToPlaybackQueue(uri);
    },

    saveTracks: async (ids: string[]) => {
        return spotifyClient.currentUser.tracks.saveTracks(ids);
    },
    unsaveTracks: async (ids: string[]) => {
        return spotifyClient.currentUser.tracks.removeSavedTracks(ids);
    },
    hasSavedTracks: async (ids: string[]) => {
        return spotifyClient.currentUser.tracks.hasSavedTracks(ids);
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
