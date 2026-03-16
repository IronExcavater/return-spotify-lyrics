import { useEffect, useRef, useState } from 'react';

import { getFromStorage, setInStorage } from '../../shared/storage';
import type { MediaRouteState } from './useMediaRoute';

type RouteStateStore<T> = {
    get: () => T | null;
    set: (state: T | null) => void;
    load: () => Promise<T | null>;
    isValid: (state: T) => boolean;
};

type CreateRouteStateStoreInput<T> = {
    key: string;
    isValid?: (state: T) => boolean;
    shouldPersist?: (previous: T | null, next: T | null) => boolean;
};

type RouteHistory = {
    goTo: (
        path: string,
        state?: unknown,
        options?: { samePathBehavior?: 'replace' | 'push' }
    ) => void;
};

type UseRouteStateInput<T> = {
    locationState: T | null;
    store: RouteStateStore<T>;
    routeHistory: RouteHistory;
    routePath: string;
    fallbackState?: T | null;
};

const alwaysValid = () => true;

export function createRouteStateStore<T>({
    key,
    isValid = alwaysValid,
    shouldPersist,
}: CreateRouteStateStoreInput<T>): RouteStateStore<T> {
    let lastState: T | null = null;

    const normalize = (state: T | null) =>
        state && isValid(state) ? state : null;

    const get = () => lastState;

    const set = (state: T | null) => {
        const next = normalize(state);
        const previous = lastState;
        lastState = next;
        if (shouldPersist && !shouldPersist(previous, next)) return;
        void setInStorage(key, next ?? undefined);
    };

    const load = async () => {
        const stored = await getFromStorage<T>(key);
        const next = normalize(stored ?? null);
        if (next) lastState = next;
        return next;
    };

    return { get, set, load, isValid };
}

export function useRouteState<T>({
    locationState,
    store,
    routeHistory,
    routePath,
    fallbackState,
}: UseRouteStateInput<T>) {
    const hasValidState = (state: T | null) =>
        state != null && store.isValid(state);
    const validLocationState = hasValidState(locationState)
        ? locationState
        : null;
    const validFallbackState = hasValidState(fallbackState ?? null)
        ? (fallbackState ?? null)
        : null;

    const [restoredState, setRestoredState] = useState<T | null>(null);
    const [restoring, setRestoring] = useState(validLocationState == null);
    const restoreGuard = useRef(false);

    useEffect(() => {
        if (validLocationState) {
            setRestoring(false);
            return;
        }
        let cancelled = false;
        void store.load().then((stored) => {
            if (cancelled) return;
            const next = hasValidState(stored) ? stored : null;
            if (next) setRestoredState(next);
            setRestoring(false);
        });
        return () => {
            cancelled = true;
        };
    }, [validLocationState, store]);

    const state =
        validLocationState ??
        restoredState ??
        validFallbackState ??
        store.get() ??
        null;

    useEffect(() => {
        if (validLocationState) {
            store.set(validLocationState);
            restoreGuard.current = false;
            return;
        }
        if (state && !restoreGuard.current) {
            restoreGuard.current = true;
            routeHistory.goTo(routePath, state);
        }
    }, [routeHistory, routePath, state, store, validLocationState]);

    return { state, restoring };
}

const shouldPersistMediaState = (
    previous: MediaRouteState | null,
    next: MediaRouteState | null
) => {
    if (!previous || !next) return true;
    return (
        previous.kind !== next.kind ||
        previous.id !== next.id ||
        previous.singleTrack !== next.singleTrack
    );
};

const shouldPersistPlaylistState = (
    previous: MediaRouteState | null,
    next: MediaRouteState | null
) => {
    if (!previous || !next) return true;
    return previous.id !== next.id || previous.selectedId !== next.selectedId;
};

const isPlaylistState = (state: MediaRouteState) => state.kind === 'playlist';
const isMediaState = (state: MediaRouteState) => state.kind !== 'playlist';

export const mediaRouteStore = createRouteStateStore<MediaRouteState>({
    key: 'mediaRouteState',
    isValid: isMediaState,
    shouldPersist: shouldPersistMediaState,
});

export const playlistRouteStore = createRouteStateStore<MediaRouteState>({
    key: 'playlistRouteState',
    isValid: isPlaylistState,
    shouldPersist: shouldPersistPlaylistState,
});
