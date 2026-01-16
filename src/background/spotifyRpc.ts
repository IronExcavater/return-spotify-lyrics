import type { ItemTypes, MaxInt, Market } from '@spotify/web-api-ts-sdk';
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
    startPlayback: async ({
        uris,
        contextUri,
        offset,
        positionMs,
    }: {
        uris?: string[];
        contextUri?: string;
        offset?: { position?: number };
        positionMs?: number;
    }) => {
        const client = await requireClient();
        return client.player.startResumePlayback(
            '',
            contextUri,
            uris,
            offset,
            positionMs
        );
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
    getUserPlaylists: async ({
        limit = 20,
        offset = 0,
    }: {
        limit?: MaxInt<50>;
        offset?: number;
    } = {}) => {
        const client = await requireClient();
        return client.currentUser.playlists.playlists(limit, offset);
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
    getAlbum: async ({ id, market }: { id: string; market?: Market }) => {
        const client = await requireClient();
        return client.albums.get(id, market);
    },
    getAlbumTracks: async ({
        id,
        market,
        limit = 50,
        offset = 0,
    }: {
        id: string;
        market?: Market;
        limit?: MaxInt<50>;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.albums.tracks(id, market, limit, offset);
    },
    getArtist: async ({ id }: { id: string }) => {
        const client = await requireClient();
        return client.artists.get(id);
    },
    getArtistTopTracks: async ({
        id,
        market,
    }: {
        id: string;
        market: Market;
    }) => {
        const client = await requireClient();
        return client.artists.topTracks(id, market);
    },
    getArtistAlbums: async ({
        id,
        market,
        limit = 20,
        offset = 0,
    }: {
        id: string;
        market?: Market;
        limit?: MaxInt<50>;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.artists.albums(id, undefined, market, limit, offset);
    },
    getArtistRelatedArtists: async ({ id }: { id: string }) => {
        const client = await requireClient();
        return client.artists.relatedArtists(id);
    },
    getShow: async ({ id, market }: { id: string; market?: Market }) => {
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
        market?: Market;
        limit?: MaxInt<50>;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.shows.episodes(id, market, limit, offset);
    },
    getPlaylist: async ({ id, market }: { id: string; market?: Market }) => {
        const client = await requireClient();
        return client.playlists.getPlaylist(id, market);
    },
    getPlaylistItems: async ({
        id,
        market,
        limit = 50,
        offset = 0,
    }: {
        id: string;
        market?: Market;
        limit?: MaxInt<50>;
        offset?: number;
    }) => {
        const client = await requireClient();
        return client.playlists.getPlaylistItems(
            id,
            undefined,
            market,
            limit,
            offset
        );
    },
    getTrack: async ({ id }: { id: string }) => {
        const client = await requireClient();
        return client.tracks.get(id);
    },
    getEpisode: async ({ id, market }: { id: string; market?: Market }) => {
        const client = await requireClient();
        return client.episodes.get(id, market);
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
