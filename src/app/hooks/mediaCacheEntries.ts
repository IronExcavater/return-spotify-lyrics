import type { Episode, Track, UserProfile } from '@spotify/web-api-ts-sdk';

import type { MediaItem } from '../../shared/types';
import { updateMediaCacheEntry } from './useMediaCache';

export const MEDIA_CACHE_KEYS = {
    profile: 'profile',
    nowPlaying: 'now-playing',
    queueView: 'queue-view',
} as const;

export type NowPlayingItem = Track | Episode;

export type ProfileCacheEntry = {
    id: string;
    name: string;
    imageUrl?: string;
    externalUrl?: string;
};

export type NowPlayingCacheEntry = {
    id?: string;
    uri?: string;
    type: 'track' | 'episode';
    title: string;
    subtitle?: string;
    imageUrl?: string;
    item: NowPlayingItem;
};

const isEpisodeItem = (item: NowPlayingItem): item is Episode =>
    item.type === 'episode' || 'show' in item;

const toNowPlayingCacheEntry = (item: NowPlayingItem): NowPlayingCacheEntry => {
    if (isEpisodeItem(item)) {
        return {
            id: item.id,
            uri: item.uri,
            type: 'episode',
            title: item.name,
            subtitle: item.show?.name,
            imageUrl: item.show?.images?.[0]?.url ?? item.images?.[0]?.url,
            item,
        };
    }

    return {
        id: item.id,
        uri: item.uri,
        type: 'track',
        title: item.name,
        subtitle: item.artists?.map((artist) => artist.name).join(', '),
        imageUrl: item.album?.images?.[0]?.url,
        item,
    };
};

const toProfileCacheEntry = (profile: UserProfile): ProfileCacheEntry => ({
    id: profile.id,
    name: profile.display_name ?? profile.id,
    imageUrl: profile.images?.[0]?.url,
    externalUrl: profile.external_urls?.spotify,
});

const parseArtistNames = (value?: string) =>
    value
        ?.split(',')
        .map((part) => part.trim())
        .filter(Boolean) ?? [];

const toAssumedNowPlayingItem = (item: MediaItem): NowPlayingItem | null => {
    if (item.kind === 'episode') {
        return {
            id: item.id,
            uri: item.uri,
            name: item.title,
            type: 'episode',
            images: item.imageUrl ? [{ url: item.imageUrl }] : [],
            show:
                item.parentId || item.parentTitle || item.subtitle
                    ? {
                          id: item.parentId ?? undefined,
                          name: item.parentTitle ?? item.subtitle ?? '',
                          images: item.imageUrl ? [{ url: item.imageUrl }] : [],
                      }
                    : undefined,
        } as unknown as Episode;
    }

    if (item.kind && item.kind !== 'track') return null;

    const artists =
        item.artists?.map((artist) => ({
            id: artist.id,
            name: artist.name,
        })) ??
        parseArtistNames(item.subtitle).map((name) => ({
            name,
        }));

    return {
        id: item.id,
        uri: item.uri,
        name: item.title,
        type: 'track',
        artists,
        album: {
            id: item.parentId ?? undefined,
            name: item.parentTitle ?? '',
            images: item.imageUrl ? [{ url: item.imageUrl }] : [],
            total_tracks: item.parentIsSingle ? 1 : undefined,
        },
    } as unknown as Track;
};

export const updateCachedProfile = (
    profile: UserProfile | null | undefined
) => {
    if (!profile) return;

    const entry = toProfileCacheEntry(profile);
    const signature = [
        entry.id,
        entry.name,
        entry.imageUrl ?? '',
        entry.externalUrl ?? '',
    ].join('|');

    updateMediaCacheEntry(MEDIA_CACHE_KEYS.profile, entry, {
        signature,
        imageUrl: entry.imageUrl,
    });
};

export const updateCachedNowPlaying = (
    item: NowPlayingItem | null | undefined
) => {
    if (!item) return;

    const entry = toNowPlayingCacheEntry(item);
    const signature = [
        entry.type,
        entry.id ?? '',
        entry.uri ?? '',
        entry.title,
        entry.subtitle ?? '',
        entry.imageUrl ?? '',
    ].join('|');

    updateMediaCacheEntry(MEDIA_CACHE_KEYS.nowPlaying, entry, {
        signature,
        imageUrl: entry.imageUrl,
    });
};

export const updateCachedAssumedNowPlaying = (
    item: MediaItem | null | undefined
) => {
    if (!item) return;
    const nowPlayingItem = toAssumedNowPlayingItem(item);
    if (!nowPlayingItem) return;
    updateCachedNowPlaying(nowPlayingItem);
};
