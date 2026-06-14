import type { Playlist, Track } from '@spotify/web-api-ts-sdk';

import type { PlaylistDedupableItem } from '../duplicates';

export const SPOTIFY_CONNECTION_KEY = 'spotifyConnectionMeta';
export const TRACK_PLAYLIST_CACHE_KEY = 'trackPlaylistCache';
export const LIKED_STALE_MS = 5 * 60 * 1000;
export const CATALOG_FRESH_MS = 15 * 60 * 1000;
export const CATALOG_USABLE_MS = 7 * 24 * 60 * 60 * 1000;
export const PARTIAL_MEMBERSHIP_USABLE_MS = 24 * 60 * 60 * 1000;
export const PLAYLIST_CONTENT_FRESH_MS = 5 * 60 * 1000;
export const PLAYLIST_CONTENT_USABLE_MS = 7 * 24 * 60 * 60 * 1000;
export const PLAYLIST_CONTENT_CACHE_LIMIT = 6;
export const LIKED_PLAYLIST_ID = '__liked_tracks__';
export const PLAYLIST_PAGE_SIZE = 50;

export type PlaylistCatalogEntry = {
    id: string;
    name: string;
    imageUrl?: string;
    ownerName?: string;
    snapshotId: string;
    total: number;
    editable: boolean;
};

export type PlaylistWithNullablePublic = Omit<Playlist<Track>, 'public'> & {
    public: boolean | null;
};

export type PlaylistEntrySource = Pick<
    Playlist<Track>,
    'id' | 'name' | 'images' | 'snapshot_id' | 'collaborative'
> & {
    owner?: Pick<Playlist<Track>['owner'], 'id' | 'display_name'> | null;
    tracks?: { total?: number | null } | null;
};

export type PlaylistContentState = {
    playlist: PlaylistWithNullablePublic;
    items: PlaylistDedupableItem[];
    totalDurationMs: number;
    itemsOffset: number;
    itemsHasMore: boolean;
    itemsLoadingMore: boolean;
    snapshotId?: string;
    fetchedAt: number;
};

export type LikedMembershipCache = {
    userId?: string;
    liked: Record<string, { saved: boolean; updatedAt: number }>;
};

export type PlaylistCatalogCache = {
    userId?: string;
    fetchedAt: number;
    complete: boolean;
    playlists: PlaylistCatalogEntry[];
};

export type PlaylistTrackIndexCacheEntry = {
    playlistId: string;
    snapshotId: string;
    total: number;
    loadedCount: number;
    trackIds: string[];
    updatedAt: number;
};

export type PlaylistContentChunkCacheEntry = {
    offset: number;
    items: PlaylistDedupableItem[];
    trackIds: string[];
    cumulativeDurationMs: number;
    updatedAt: number;
};

export type PlaylistContentCacheEntry = {
    playlistId: string;
    snapshotId: string;
    total: number;
    playlist?: PlaylistWithNullablePublic;
    fetchedAt: number;
    updatedAt: number;
    chunksByOffset: Record<string, PlaylistContentChunkCacheEntry>;
};

export type TrackPlaylistCache = {
    userId?: string;
    catalog?: PlaylistCatalogCache;
    membershipsByPlaylistId: Record<string, PlaylistTrackIndexCacheEntry>;
    contentsByPlaylistId: Record<string, PlaylistContentCacheEntry>;
};

export type TrackPlaylistsResult = {
    userId?: string;
    catalog: PlaylistCatalogEntry[];
    membership: Record<string, boolean | null>;
    loadingById: Record<string, boolean>;
    needsLikedRefresh: boolean;
};

export type CachedPlaylistContentResult = {
    entry: PlaylistContentState | null;
    fresh: boolean;
    usable: boolean;
};
