import type { SimplifiedPlaylist } from '@spotify/web-api-ts-sdk';

import { sendSpotifyMessage } from '../../shared/messaging';
import { getFromStorage } from '../../shared/storage';
import type { MediaItem } from '../../shared/types';
import type { SpotifyConnectionMeta } from '../hooks/useAuth';

const SPOTIFY_CONNECTION_KEY = 'spotifyConnectionMeta';
const LIKED_STALE_MS = 5 * 60 * 1000;
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

export const LIKED_PLAYLIST_ID = '__liked_tracks__';

export type TrackPlaylistTarget = {
    trackId: string;
    trackUri: string;
};

export type PlaylistCatalogEntry = {
    id: string;
    name: string;
    imageUrl?: string;
    ownerName?: string;
    snapshotId: string;
    total: number;
    editable: boolean;
};

type LikedMembershipCache = {
    userId?: string;
    liked: Record<string, { saved: boolean; updatedAt: number }>;
};

type TrackPlaylistsResult = {
    userId?: string;
    catalog: PlaylistCatalogEntry[];
    membership: Record<string, boolean | null>;
    loadingById: Record<string, boolean>;
    needsLikedRefresh: boolean;
};

const likedCache: LikedMembershipCache = {
    userId: undefined,
    liked: {},
};
const likedPromises = new Map<string, Promise<boolean>>();

const parseSpotifyTrackId = (value?: string) => {
    if (!value) return undefined;

    const uriMatch = /^spotify:track:([A-Za-z0-9]{22})$/.exec(value);
    if (uriMatch) return uriMatch[1];

    return SPOTIFY_ID_PATTERN.test(value) ? value : undefined;
};

const toPlaylistEntry = (
    playlist: SimplifiedPlaylist,
    currentUserId?: string
): PlaylistCatalogEntry => ({
    id: playlist.id,
    name: playlist.name,
    imageUrl: playlist.images?.[0]?.url,
    ownerName: playlist.owner?.display_name ?? undefined,
    snapshotId: playlist.snapshot_id,
    total: playlist.tracks?.total ?? 0,
    editable: playlist.collaborative || playlist.owner?.id === currentUserId,
});

const getCurrentUserId = async () => {
    const connection = await getFromStorage<SpotifyConnectionMeta>(
        SPOTIFY_CONNECTION_KEY
    );
    return connection?.userId;
};

const syncLikedCacheOwner = (userId?: string) => {
    if (userId === likedCache.userId) return;

    likedCache.userId = userId;
    likedCache.liked = {};
    likedPromises.clear();
};

const isLikedFresh = (trackId: string) => {
    const liked = likedCache.liked[trackId];
    return Boolean(liked && Date.now() - liked.updatedAt < LIKED_STALE_MS);
};

export const resolveTrackPlaylistTarget = (
    item?: MediaItem | null
): TrackPlaylistTarget | null => {
    if (item?.kind !== 'track') return null;

    const trackId =
        parseSpotifyTrackId(item.id) ?? parseSpotifyTrackId(item.uri);
    if (!trackId) return null;

    const trackUri = item.uri?.startsWith('spotify:track:')
        ? item.uri
        : `spotify:track:${trackId}`;

    return { trackId, trackUri };
};

export const canManageTrackPlaylists = (item?: MediaItem | null) =>
    Boolean(resolveTrackPlaylistTarget(item));

export const formatTrackPlaylistError = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    if (
        lower.includes('scope') ||
        lower.includes('insufficient') ||
        lower.includes('permission')
    ) {
        return 'Reconnect Spotify to load playlists.';
    }
    if (lower.includes('rate') || lower.includes('429')) {
        return 'Spotify is rate limiting playlist requests. Try again shortly.';
    }
    return message || fallback;
};

export const loadTrackPlaylists = async (
    target: TrackPlaylistTarget
): Promise<TrackPlaylistsResult> => {
    const userId = await getCurrentUserId();
    syncLikedCacheOwner(userId);

    const liked = isLikedFresh(target.trackId)
        ? likedCache.liked[target.trackId].saved
        : null;

    return {
        userId,
        catalog: [],
        membership: {
            [LIKED_PLAYLIST_ID]: liked,
        },
        loadingById: {
            [LIKED_PLAYLIST_ID]: liked == null,
        },
        needsLikedRefresh: liked == null,
    };
};

export const loadTrackPlaylistCatalog = async (userId?: string) => {
    const resolvedUserId = userId ?? (await getCurrentUserId());
    const playlists = await sendSpotifyMessage('getUserPlaylists', {
        limit: 50,
        offset: 0,
    });
    return playlists.items.map((playlist) =>
        toPlaylistEntry(playlist, resolvedUserId)
    );
};

export const ensureTrackLikedMembership = async ({
    trackId,
    userId,
}: {
    trackId: string;
    userId?: string;
}) => {
    syncLikedCacheOwner(userId);

    if (isLikedFresh(trackId)) {
        return likedCache.liked[trackId].saved;
    }

    const existingPromise = likedPromises.get(trackId);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
        const result = await sendSpotifyMessage('hasSavedTracks', [trackId]);
        const saved = Boolean(result[0]);

        likedCache.liked[trackId] = {
            saved,
            updatedAt: Date.now(),
        };

        return saved;
    })().finally(() => {
        likedPromises.delete(trackId);
    });

    likedPromises.set(trackId, promise);
    return promise;
};

export const ensureTrackPlaylistIndex = async ({
    playlist,
}: {
    playlist: PlaylistCatalogEntry;
    userId?: string;
}) => {
    const index = await sendSpotifyMessage('getPlaylistMembershipIndex', {
        id: playlist.id,
        snapshotId: playlist.snapshotId,
    });

    return {
        playlistId: index.playlistId,
        snapshotId: index.snapshotId,
        total: index.total,
        trackIds: index.trackIds,
        updatedAt: Date.now(),
    };
};

export const toggleTrackPlaylistMembership = async ({
    playlistId,
    playlist,
    trackId,
    trackUri,
    shouldSave,
    userId,
}: {
    playlistId: string;
    playlist?: PlaylistCatalogEntry;
    trackId: string;
    trackUri: string;
    shouldSave: boolean;
    userId?: string;
}) => {
    if (playlistId === LIKED_PLAYLIST_ID) {
        syncLikedCacheOwner(userId);

        if (shouldSave) await sendSpotifyMessage('saveTracks', [trackId]);
        else await sendSpotifyMessage('unsaveTracks', [trackId]);

        likedCache.liked[trackId] = {
            saved: shouldSave,
            updatedAt: Date.now(),
        };
        return;
    }

    if (!playlist) {
        throw new Error('Playlist not found');
    }

    if (shouldSave) {
        await sendSpotifyMessage('addTracksToPlaylist', {
            playlistId,
            uris: [trackUri],
        });
        return;
    }

    await sendSpotifyMessage('removeTracksFromPlaylist', {
        playlistId,
        uris: [trackUri],
        snapshotId: playlist.snapshotId,
    });
};
