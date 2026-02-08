import type { MediaItem, MediaKind } from '../../shared/types';

export type MediaRouteState = {
    kind: MediaKind;
    id: string;
    selectedId?: string;
    singleTrack?: boolean;
};

export const buildMediaRouteFromItem = (
    item: MediaItem
): MediaRouteState | null => {
    if (!item.id || !item.kind) return null;

    if (
        (item.kind === 'track' || item.kind === 'episode') &&
        item.parentKind &&
        item.parentId
    ) {
        return {
            kind: item.parentKind,
            id: item.parentId,
            selectedId: item.id,
            singleTrack:
                item.kind === 'track' ? item.parentIsSingle : undefined,
        };
    }

    return {
        kind: item.kind,
        id: item.id,
    };
};

export const buildMediaNavigationFromItem = (
    item: MediaItem
): { path: '/media' | '/playlist'; state: MediaRouteState } | null => {
    const state = buildMediaRouteFromItem(item);
    if (!state) return null;
    if (state.kind === 'playlist') {
        return { path: '/playlist', state };
    }
    return { path: '/media', state };
};
