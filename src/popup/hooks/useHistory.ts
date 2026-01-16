import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchFilter } from '../../shared/types';
import type { MediaRouteState } from '../helpers/mediaRoute';

export type HomeRouteState = {
    searchQuery?: string;
    searchFilters?: SearchFilter[];
};

export type RouteState = HomeRouteState | MediaRouteState;

export type HistoryEntry = {
    path: string;
    state?: RouteState;
};

const shouldTrack = (path: string) =>
    path === '/home' ||
    path === '/profile' ||
    path === '/media' ||
    path.startsWith('/media/');

const isMediaState = (state?: RouteState): state is MediaRouteState =>
    !!state && 'kind' in state && 'id' in state;

const serializeFilters = (filters?: SearchFilter[]) =>
    JSON.stringify(
        (filters ?? []).map((filter) => ({
            id: filter.id,
            kind: filter.kind,
            label: filter.label,
            value: filter.value,
        }))
    );

const serializeState = (state?: RouteState) => {
    if (!state) return '';
    if (isMediaState(state)) {
        return `media:${state.kind}:${state.id}:${state.selectedId ?? ''}`;
    }
    return `home:${state.searchQuery ?? ''}:${serializeFilters(
        state.searchFilters
    )}`;
};

const listeners = new Set<() => void>();
const historyStack: HistoryEntry[] = [];

const emit = () => {
    listeners.forEach((listener) => listener());
};

const getCanGoBack = () => historyStack.length > 1;

const recordRoute = (path: string, state?: RouteState) => {
    if (!shouldTrack(path)) return;

    const last = historyStack[historyStack.length - 1];
    if (last && last.path === path) {
        const lastKey = serializeState(last.state);
        const nextKey = serializeState(state);
        if (lastKey !== nextKey) {
            historyStack.push({ path, state });
            emit();
        }
        return;
    }

    historyStack.push({ path, state });
    emit();
};

const popRoute = () => {
    if (historyStack.length < 2) return null;
    historyStack.pop();
    emit();
    return historyStack[historyStack.length - 1] ?? null;
};

export function useHistory() {
    const navigate = useNavigate();
    const location = useLocation();
    const [canGoBack, setCanGoBack] = useState(getCanGoBack());
    const lastLocation = useRef<string | null>(null);

    useEffect(() => {
        const update = () => setCanGoBack(getCanGoBack());
        listeners.add(update);
        return () => {
            listeners.delete(update);
        };
    }, []);

    useEffect(() => {
        if (lastLocation.current === location.pathname) return;
        lastLocation.current = location.pathname;
        recordRoute(
            location.pathname,
            location.state as RouteState | undefined
        );
    }, [location.pathname, location.state]);

    const goTo = useCallback(
        (path: string, state?: RouteState) => {
            recordRoute(path, state);
            navigate(path, { state, replace: location.pathname === path });
        },
        [location.pathname, navigate]
    );

    const goBack = useCallback((): HistoryEntry | null => {
        const previous = popRoute();
        if (!previous) return null;
        navigate(previous.path, { state: previous.state, replace: true });
        return previous;
    }, [navigate]);

    const rememberState = useCallback(
        (state?: RouteState) => {
            recordRoute(location.pathname, state);
        },
        [location.pathname]
    );

    return {
        canGoBack,
        goBack,
        goTo,
        rememberState,
    };
}
