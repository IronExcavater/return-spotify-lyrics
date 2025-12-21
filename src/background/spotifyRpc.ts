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
    getRecentlyPlayed: async (limit = 12) => {
        const client = await requireClient();
        return client.player.getRecentlyPlayedTracks(limit);
    },
    pausePlayback: async () => {
        const client = await requireClient();
        return client.player.pausePlayback('');
    },
    startResumePlayback: async (options?: {
        deviceId?: string;
        contextUri?: string;
        uris?: string[];
        offset?: object;
        positionMs?: number;
    }) => {
        const client = await requireClient();
        return client.player.startResumePlayback(
            options?.deviceId ?? '',
            options?.contextUri,
            options?.uris,
            options?.offset,
            options?.positionMs
        );
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

    getUserPlaylists: async (limit = 12, offset = 0) => {
        const client = await requireClient();
        return client.currentUser.playlists.playlists(limit, offset);
    },

    getMadeForYou: async (limit = 12, offset = 0) => {
        const client = await requireClient();
        return client.browse.getPlaylistsForCategory(
            'made-for-you',
            undefined,
            limit,
            offset
        );
    },

    getAlbum: async ({ id, market }: { id: string; market?: string }) => {
        const client = await requireClient();
        return client.albums.get(id, market);
    },
    getAlbumTracks: async ({
        albumId,
        market,
        limit = 50,
        offset = 0,
    }: {
        albumId: string;
        market?: string;
        limit?: number;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.albums.tracks(albumId, market, limit, offset);
    },
    getPlaylist: async ({ id, market }: { id: string; market?: string }) => {
        const client = await requireClient();
        return client.playlists.getPlaylist(id, market);
    },
    getTrack: async ({ id, market }: { id: string; market?: string }) => {
        const client = await requireClient();
        return client.tracks.get(id, market);
    },
    getArtist: async (id: string) => {
        const client = await requireClient();
        return client.artists.get(id);
    },
    getArtistTopTracks: async ({
        id,
        market,
    }: {
        id: string;
        market: string;
    }) => {
        const client = await requireClient();
        return client.artists.topTracks(id, market);
    },
    getShow: async ({ id, market }: { id: string; market: string }) => {
        const client = await requireClient();
        return client.shows.get(id, market);
    },
    getShowEpisodes: async ({
        id,
        market,
        limit = 50,
        offset = 0,
    }: {
        id: string;
        market?: string;
        limit?: number;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.shows.episodes(id, market, limit, offset);
    },
    getEpisode: async ({ id, market }: { id: string; market: string }) => {
        const client = await requireClient();
        return client.episodes.get(id, market);
    },

    search: async ({
        query,
        types,
        limit = 8,
        offset = 0,
        market,
    }: {
        query: string;
        types: readonly (
            | 'album'
            | 'artist'
            | 'playlist'
            | 'track'
            | 'show'
            | 'episode'
        )[];
        limit?: number;
        offset?: number;
        market?: string;
    }) => {
        const client = await requireClient();
        return client.search(query, types, market, limit, offset);
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
