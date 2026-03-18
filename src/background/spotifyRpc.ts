import type { ItemTypes, MaxInt, Market } from '@spotify/web-api-ts-sdk';
import { getSpotifySdk } from './spotifyAuth.ts';
import {
    addSpotifyPlaylistTracks,
    clearSpotifyPlaylistMembership,
    getSpotifyPlaylistMembership,
    removeSpotifyPlaylistTracks,
} from './spotifyPlaylistMembership.ts';

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

export const clearSpotifyRpcCaches = () => {
    clearSpotifyPlaylistMembership();
};

const saveSpotifyTracks = async (ids: string[]) => {
    const client = await requireClient();
    await client.makeRequest('PUT', 'me/tracks', { ids });
};

const removeSavedSpotifyTracks = async (ids: string[]) => {
    const client = await requireClient();
    await client.makeRequest('DELETE', 'me/tracks', { ids });
};

const hasSavedSpotifyTracks = async (ids: string[]) => {
    const client = await requireClient();
    const params = new URLSearchParams({ ids: ids.join(',') });
    return client.makeRequest<boolean[]>('GET', `me/tracks/contains?${params}`);
};

const startPlaybackRequest = async (
    client: Awaited<ReturnType<typeof requireClient>>,
    deviceId: string | undefined,
    {
        contextUri,
        uris,
        offset,
        positionMs,
    }: {
        contextUri?: string;
        uris?: string[];
        offset?: { position?: number };
        positionMs?: number;
    }
) => {
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    const query = params.toString();
    const usingCustomUris = Array.isArray(uris) && uris.length > 0;
    const body = {
        ...(contextUri ? { context_uri: contextUri } : {}),
        ...(usingCustomUris ? { uris } : {}),
        ...(!usingCustomUris && offset ? { offset } : {}),
        ...(positionMs != null ? { position_ms: positionMs } : {}),
    };

    await client.makeRequest(
        'PUT',
        `me/player/play${query ? `?${query}` : ''}`,
        body
    );
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
            startPlaybackRequest(client, deviceId, {
                contextUri,
                uris,
                offset,
                positionMs,
            })
        );
    },
    syncQueue: async ({
        upcomingUris,
        currentUri,
    }: {
        upcomingUris: string[];
        currentUri?: string;
    }) => {
        const client = await requireClient();
        return withActiveDevice(client, async (deviceId) => {
            const playback = await client.player.getPlaybackState();
            const resolvedCurrentUri =
                playback?.item?.uri ?? currentUri ?? null;
            const queueUris = upcomingUris.filter((uri) => Boolean(uri));
            const uris = resolvedCurrentUri
                ? [resolvedCurrentUri, ...queueUris]
                : queueUris;
            if (uris.length === 0) return;

            await startPlaybackRequest(client, deviceId, {
                uris,
                positionMs:
                    resolvedCurrentUri &&
                    playback?.item?.uri === resolvedCurrentUri
                        ? (playback.progress_ms ?? undefined)
                        : undefined,
            });
        });
    },

    saveTracks: saveSpotifyTracks,
    unsaveTracks: removeSavedSpotifyTracks,
    hasSavedTracks: hasSavedSpotifyTracks,
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
            market,
            undefined,
            limit,
            offset
        );
    },
    getPlaylistMembershipIndex: async ({
        id,
        market,
        snapshotId,
    }: {
        id: string;
        market?: Market;
        snapshotId?: string;
    }) => {
        return getSpotifyPlaylistMembership({ id, market, snapshotId });
    },
    addTracksToPlaylist: async ({
        playlistId,
        uris,
        position,
    }: {
        playlistId: string;
        uris: string[];
        position?: number;
    }) => addSpotifyPlaylistTracks({ playlistId, uris, position }),
    removeTracksFromPlaylist: async ({
        playlistId,
        uris,
        snapshotId,
    }: {
        playlistId: string;
        uris: string[];
        snapshotId?: string;
    }) => removeSpotifyPlaylistTracks({ playlistId, uris, snapshotId }),
    changePlaylistDetails: async ({
        id,
        name,
        description,
        public: isPublic,
        collaborative,
    }: {
        id: string;
        name?: string;
        description?: string;
        public?: boolean | null;
        collaborative?: boolean;
    }) => {
        const client = await requireClient();
        return client.playlists.changePlaylistDetails(id, {
            name,
            description,
            public: isPublic ?? undefined,
            collaborative,
        });
    },
    movePlaylistItems: async ({
        id,
        rangeStart,
        rangeLength = 1,
        insertBefore,
        snapshotId,
    }: {
        id: string;
        rangeStart: number;
        rangeLength?: number;
        insertBefore: number;
        snapshotId?: string;
    }) => {
        const client = await requireClient();
        return client.playlists.updatePlaylistItems(id, {
            range_start: rangeStart,
            range_length: rangeLength,
            insert_before: insertBefore,
            snapshot_id: snapshotId,
        });
    },
    removePlaylistItems: async ({
        id,
        uris,
        snapshotId,
    }: {
        id: string;
        uris: string[];
        snapshotId?: string;
    }) => {
        const client = await requireClient();
        return client.playlists.removeItemsFromPlaylist(id, {
            snapshot_id: snapshotId,
            tracks: uris.map((uri) => ({ uri })),
        });
    },
    removePlaylistItemsByPosition: async ({
        id,
        tracks,
        snapshotId,
    }: {
        id: string;
        tracks: Array<{ uri: string; positions: number[] }>;
        snapshotId?: string;
    }) => {
        const client = await requireClient();
        return client.playlists.removeItemsFromPlaylist(id, {
            snapshot_id: snapshotId,
            tracks,
        });
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
