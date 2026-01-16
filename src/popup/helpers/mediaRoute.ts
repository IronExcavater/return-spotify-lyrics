import { getFromStorage, setInStorage } from '../../shared/storage';
import type { MediaItem, MediaKind } from '../../shared/types';

export type MediaRouteState = {
    kind: MediaKind;
    id: string;
    selectedId?: string;
};

let lastMediaRouteState: MediaRouteState | null = null;
const MEDIA_STATE_KEY = 'mediaRouteState';

export const getLastMediaRouteState = () => lastMediaRouteState;

export const setLastMediaRouteState = (state: MediaRouteState | null) => {
    lastMediaRouteState = state;
    void setInStorage(MEDIA_STATE_KEY, state ?? undefined);
};

export const loadLastMediaRouteState = async () => {
    const stored = await getFromStorage<MediaRouteState>(MEDIA_STATE_KEY);
    if (stored) lastMediaRouteState = stored;
    return stored ?? null;
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
        };
    }

    return {
        kind: item.kind,
        id: item.id,
    };
};
