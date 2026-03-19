import type {
    Market,
    MaxInt,
    Playlist,
    SnapshotReference,
    Track,
} from '@spotify/web-api-ts-sdk';
import { getAccessToken, getSpotifySdk } from './spotifyAuth.ts';

const PLAYLIST_PAGE_SIZE = 50 as MaxInt<50>;
const PLAYLIST_REQUEST_SPACING_MS = 250;
const SPOTIFY_TRACK_URI_PATTERN = /^spotify:track:([A-Za-z0-9]{22})$/;

export type SpotifyPlaylistTrackIndexEntry = {
    playlistId: string;
    snapshotId: string;
    total: number;
    trackIds: string[];
    updatedAt: number;
};

// Full playlist track indexes are expensive, so keep them in the background by snapshot.
const trackIndexCache = new Map<string, SpotifyPlaylistTrackIndexEntry>();
const trackIndexPromises = new Map<
    string,
    Promise<SpotifyPlaylistTrackIndexEntry>
>();
let playlistRequestQueue: Promise<void> = Promise.resolve();
let playlistBackoffUntil = 0;
let lastPlaylistRequestAt = 0;
let trackIndexOwnerKey: string | undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTrackPlaylistItem = (
    item: Playlist<Track>['tracks']['items'][number] | undefined
): item is Playlist<Track>['tracks']['items'][number] & {
    track: Track;
} => item?.track?.type === 'track';

const parseTrackIdFromUri = (uri: string) =>
    SPOTIFY_TRACK_URI_PATTERN.exec(uri)?.[1];

const noteSpotifyPlaylistRateLimit = (retryAfterMs: number) => {
    playlistBackoffUntil = Math.max(
        playlistBackoffUntil,
        Date.now() + retryAfterMs
    );
};

const syncPlaylistTrackIndexOwner = (ownerKey?: string) => {
    if (ownerKey && ownerKey === trackIndexOwnerKey) return;

    trackIndexCache.clear();
    trackIndexPromises.clear();
    playlistRequestQueue = Promise.resolve();
    playlistBackoffUntil = 0;
    lastPlaylistRequestAt = 0;
    trackIndexOwnerKey = ownerKey;
};

export const clearSpotifyPlaylistTrackIndexCache = () => {
    syncPlaylistTrackIndexOwner(undefined);
};

const patchSpotifyPlaylistTrackIndex = ({
    playlistId,
    snapshotId,
    uris,
    shouldSave,
}: {
    playlistId: string;
    snapshotId: string;
    uris: string[];
    shouldSave: boolean;
}) => {
    const existing = trackIndexCache.get(playlistId);
    if (!existing) return;

    const trackIds = [...existing.trackIds];

    uris.forEach((uri) => {
        const trackId = parseTrackIdFromUri(uri);
        if (!trackId) return;

        if (shouldSave) {
            trackIds.push(trackId);
            return;
        }

        const index = trackIds.indexOf(trackId);
        if (index >= 0) trackIds.splice(index, 1);
    });

    trackIndexCache.set(playlistId, {
        ...existing,
        snapshotId,
        total: Math.max(
            0,
            existing.total + (shouldSave ? uris.length : -uris.length)
        ),
        trackIds,
        updatedAt: Date.now(),
    });
};

const queueSpotifyPlaylistRequest = async <T>(request: () => Promise<T>) => {
    const run = async () => {
        const backoffDelay = Math.max(0, playlistBackoffUntil - Date.now());
        if (backoffDelay > 0) await sleep(backoffDelay);

        const spacingDelay = Math.max(
            0,
            PLAYLIST_REQUEST_SPACING_MS - (Date.now() - lastPlaylistRequestAt)
        );
        if (spacingDelay > 0) await sleep(spacingDelay);

        lastPlaylistRequestAt = Date.now();
        return request();
    };

    const queued = playlistRequestQueue.then(run, run);
    playlistRequestQueue = queued.then(
        () => undefined,
        () => undefined
    );
    return queued;
};

const ensurePlaylistClient = async () => {
    const [token, client] = await Promise.all([
        getAccessToken(),
        getSpotifySdk(),
    ]);
    if (!token || !client) throw new Error('Spotify session not initialised');

    syncPlaylistTrackIndexOwner(token.refresh_token);
    return client;
};

const withPlaylistRateLimit = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message.toLowerCase()
                : String(error).toLowerCase();
        if (message.includes('rate limit') || message.includes('429')) {
            noteSpotifyPlaylistRateLimit(30_000);
            throw new Error(
                'Spotify playlist requests are rate limited. Retry-After 30s.'
            );
        }
        throw error;
    }
};

export const getSpotifyPlaylistTrackIndex = async ({
    id,
    market,
    snapshotId,
}: {
    id: string;
    market?: Market;
    snapshotId?: string;
}) => {
    const existing = trackIndexCache.get(id);
    if (existing && (!snapshotId || existing.snapshotId === snapshotId)) {
        return existing;
    }

    const promiseKey = `${id}:${snapshotId ?? 'latest'}`;
    const existingPromise = trackIndexPromises.get(promiseKey);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
        const client = await ensurePlaylistClient();
        const resolvedSnapshotId =
            snapshotId ??
            (
                await queueSpotifyPlaylistRequest(() =>
                    withPlaylistRateLimit(() =>
                        client.playlists.getPlaylist(
                            id,
                            undefined,
                            'snapshot_id'
                        )
                    )
                )
            ).snapshot_id;

        const firstPage = await queueSpotifyPlaylistRequest(() =>
            withPlaylistRateLimit(() =>
                client.playlists.getPlaylistItems(
                    id,
                    market,
                    'items(track(id,type)),total',
                    PLAYLIST_PAGE_SIZE,
                    0
                )
            )
        );
        const trackIds = new Set<string>();

        const collect = (
            items: Playlist<Track>['tracks']['items'] | undefined
        ) => {
            items?.forEach((item) => {
                if (!isTrackPlaylistItem(item) || !item.track.id) return;
                trackIds.add(item.track.id);
            });
        };

        collect(firstPage.items);

        for (
            let offset = firstPage.items.length;
            offset < firstPage.total;
            offset += PLAYLIST_PAGE_SIZE
        ) {
            const page = await queueSpotifyPlaylistRequest(() =>
                withPlaylistRateLimit(() =>
                    client.playlists.getPlaylistItems(
                        id,
                        market,
                        'items(track(id,type)),total',
                        PLAYLIST_PAGE_SIZE,
                        offset
                    )
                )
            );
            collect(page.items);
        }

        const nextIndex: SpotifyPlaylistTrackIndexEntry = {
            playlistId: id,
            snapshotId: resolvedSnapshotId,
            total: firstPage.total,
            trackIds: Array.from(trackIds),
            updatedAt: Date.now(),
        };

        trackIndexCache.set(id, nextIndex);
        return nextIndex;
    })().finally(() => {
        trackIndexPromises.delete(promiseKey);
    });

    trackIndexPromises.set(promiseKey, promise);
    return promise;
};

export const addTracksToSpotifyPlaylist = async ({
    playlistId,
    uris,
    position,
}: {
    playlistId: string;
    uris: string[];
    position?: number;
}) => {
    const client = await ensurePlaylistClient();
    const response = await withPlaylistRateLimit(() =>
        client.makeRequest<SnapshotReference>(
            'POST',
            `playlists/${playlistId}/tracks`,
            {
                uris,
                ...(position !== undefined ? { position } : undefined),
            }
        )
    );

    patchSpotifyPlaylistTrackIndex({
        playlistId,
        snapshotId: response.snapshot_id,
        uris,
        shouldSave: true,
    });

    return response;
};

export const removeTracksFromSpotifyPlaylist = async ({
    playlistId,
    uris,
    snapshotId,
}: {
    playlistId: string;
    uris: string[];
    snapshotId?: string;
}) => {
    const client = await ensurePlaylistClient();
    const response = await withPlaylistRateLimit(() =>
        client.makeRequest<SnapshotReference>(
            'DELETE',
            `playlists/${playlistId}/tracks`,
            {
                tracks: uris.map((uri) => ({ uri })),
                ...(snapshotId ? { snapshot_id: snapshotId } : undefined),
            }
        )
    );

    patchSpotifyPlaylistTrackIndex({
        playlistId,
        snapshotId: response.snapshot_id,
        uris,
        shouldSave: false,
    });

    return response;
};
