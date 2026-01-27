import type { ItemTypes, MaxInt, Market } from '@spotify/web-api-ts-sdk';
import { getSpotifySdk } from './spotifyAuth.ts';

async function requireClient() {
    const client = await getSpotifySdk();
    if (!client) throw new Error('Spotify session not initialised');
    return client;
}

const isNoActiveDeviceError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return (
        message.includes('NO_ACTIVE_DEVICE') ||
        message.includes('No active device')
    );
};

const isJsonParseError = (error: unknown) => {
    if (!(error instanceof SyntaxError)) return false;
    const message = error.message;
    return (
        message.includes('is not valid JSON') ||
        message.includes('Unexpected token') ||
        message.includes('Unexpected non-whitespace character')
    );
};

const getFallbackDeviceId = async (
    client: Awaited<ReturnType<typeof requireClient>>
) => {
    const devices = await client.player.getAvailableDevices();
    const available = devices.devices?.filter(
        (device) => !device.is_restricted && device.id
    );
    if (!available || available.length === 0) return null;
    const active = available.find((device) => device.is_active);
    return (active ?? available[0])?.id ?? null;
};

const withActiveDevice = async <T>(
    client: Awaited<ReturnType<typeof requireClient>>,
    fn: (deviceId?: string) => Promise<T>
) => {
    try {
        return await fn(undefined);
    } catch (error) {
        if (isJsonParseError(error)) return undefined as T;
        if (!isNoActiveDeviceError(error)) throw error;
        const deviceId = await getFallbackDeviceId(client);
        if (!deviceId) throw error;
        await client.player.transferPlayback([deviceId], false);
        try {
            return await fn(deviceId);
        } catch (retryError) {
            if (isJsonParseError(retryError)) return undefined as T;
            throw retryError;
        }
    }
};

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
        return withActiveDevice(client, (deviceId) =>
            client.player.pausePlayback(deviceId)
        );
    },
    startResumePlayback: async () => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.startResumePlayback(deviceId)
        );
    },
    seekToPosition: async (positionMs: number) => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.seekToPosition(positionMs, deviceId)
        );
    },
    skipToNext: async () => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.skipToNext(deviceId)
        );
    },
    skipToPrevious: async () => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.skipToPrevious(deviceId)
        );
    },
    toggleShuffle: async (state: boolean) => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.togglePlaybackShuffle(state, deviceId)
        );
    },
    setRepeatMode: async (mode: 'off' | 'track' | 'context') => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.setRepeatMode(mode, deviceId)
        );
    },
    setPlaybackVolume: async (volume: number) => {
        const client = await requireClient();
        return withActiveDevice(client, (deviceId) =>
            client.player.setPlaybackVolume(volume, deviceId)
        );
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
        return withActiveDevice(client, (deviceId) =>
            client.player.addItemToPlaybackQueue(uri, deviceId)
        );
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
        return withActiveDevice(client, (deviceId) =>
            client.player.startResumePlayback(
                deviceId,
                contextUri,
                uris,
                offset,
                positionMs
            )
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
