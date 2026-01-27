import { getFromStorage, setInStorage } from '../../shared/storage';
import type { MediaItem, MediaKind } from '../../shared/types';

export type MediaRouteState = {
    kind: MediaKind;
    id: string;
    selectedId?: string;
    singleTrack?: boolean;
};

let lastMediaRouteState: MediaRouteState | null = null;
const MEDIA_STATE_KEY = 'mediaRouteState';

export const getLastMediaRouteState = () => lastMediaRouteState;

export const setLastMediaRouteState = (state: MediaRouteState | null) => {
    const previous = lastMediaRouteState;
    lastMediaRouteState = state;
    const shouldPersist =
        !previous ||
        !state ||
        previous.kind !== state.kind ||
        previous.id !== state.id ||
        previous.singleTrack !== state.singleTrack;
    if (shouldPersist) {
        void setInStorage(MEDIA_STATE_KEY, state ?? undefined);
    }
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
            singleTrack:
                item.kind === 'track' ? item.parentIsSingle : undefined,
        };
    }

    return {
        kind: item.kind,
        id: item.id,
    };
};
