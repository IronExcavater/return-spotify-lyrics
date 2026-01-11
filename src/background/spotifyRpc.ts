import type { ItemTypes, MaxInt } from '@spotify/web-api-ts-sdk';
import { getSpotifySdk } from './spotifyAuth.ts';

async function requireClient() {
    const client = await getSpotifySdk();
    if (!client) throw new Error('Spotify session not initialised');
    return client;
}

export const spotifyRpc = {
    currentUser: async () => {
        const client = await requireClient();
        return client.currentUser.profile();
    },

    getPlaybackState: async () => {
        const client = await requireClient();
        return client.player.getPlaybackState();
    },
    pausePlayback: async () => {
        const client = await requireClient();
        return client.player.pausePlayback('');
    },
    startResumePlayback: async () => {
        const client = await requireClient();
        return client.player.startResumePlayback('');
    },
    seekToPosition: async (positionMs: number) => {
        const client = await requireClient();
        return client.player.seekToPosition(positionMs);
    },
    skipToNext: async () => {
        const client = await requireClient();
        return client.player.skipToNext('');
    },
    skipToPrevious: async () => {
        const client = await requireClient();
        return client.player.skipToPrevious('');
    },
    toggleShuffle: async (state: boolean) => {
        const client = await requireClient();
        return client.player.togglePlaybackShuffle(state);
    },
    setRepeatMode: async (mode: 'off' | 'track' | 'context') => {
        const client = await requireClient();
        return client.player.setRepeatMode(mode);
    },
    setPlaybackVolume: async (volume: number) => {
        const client = await requireClient();
        return client.player.setPlaybackVolume(volume);
    },
    getAvailableDevices: async () => {
        const client = await requireClient();
        return client.player.getAvailableDevices();
    },
    transferPlayback: async ({ deviceId }: { deviceId: string }) => {
        const client = await requireClient();
        return client.player.transferPlayback([deviceId], true);
    },

    getQueue: async () => {
        const client = await requireClient();
        return client.player.getUsersQueue();
    },
    addToQueue: async (uri: string) => {
        const client = await requireClient();
        return client.player.addItemToPlaybackQueue(uri);
    },

    saveTracks: async (ids: string[]) => {
        const client = await requireClient();
        return client.currentUser.tracks.saveTracks(ids);
    },
    unsaveTracks: async (ids: string[]) => {
        const client = await requireClient();
        return client.currentUser.tracks.removeSavedTracks(ids);
    },
    hasSavedTracks: async (ids: string[]) => {
        const client = await requireClient();
        return client.currentUser.tracks.hasSavedTracks(ids);
    },
    getRecentlyPlayedTracks: async ({
        limit = 20,
    }: {
        limit?: MaxInt<50>;
    } = {}) => {
        const client = await requireClient();
        return client.player.getRecentlyPlayedTracks(limit);
    },
    getTopTracks: async ({
        limit = 20,
        timeRange = 'short_term',
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        timeRange?: 'short_term' | 'medium_term' | 'long_term';
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.currentUser.topItems('tracks', timeRange, limit, offset);
    },
    getTopArtists: async ({
        limit = 20,
        timeRange = 'short_term',
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        timeRange?: 'short_term' | 'medium_term' | 'long_term';
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.currentUser.topItems('artists', timeRange, limit, offset);
    },
    getSavedTracks: async ({
        limit = 20,
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.currentUser.tracks.savedTracks(limit, offset);
    },
    getNewReleases: async ({
        limit = 20,
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.browse.getNewReleases(undefined, limit, offset);
    },
    getFeaturedPlaylists: async ({
        limit = 20,
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.browse.getFeaturedPlaylists(
            undefined,
            undefined,
            undefined,
            limit,
            offset
        );
    },
    search: async ({
        query,
        types,
        limit = 20,
        offset = 0,
    }: {
        query: string;
        types: ItemTypes[];
        limit?: MaxInt<50>;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.search(query, types, undefined, limit, offset);
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
