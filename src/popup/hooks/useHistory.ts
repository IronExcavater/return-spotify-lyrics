import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchFilter } from '../../shared/types';
import type { MediaRouteState } from './useMediaRoute';

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
    path === '/playlist' ||
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

const normalizeState = (state?: RouteState): RouteState | undefined => {
    if (!state) return undefined;
    if (isMediaState(state)) return state;
    const query = state.searchQuery?.trim() ?? '';
    const filters =
        state.searchFilters && state.searchFilters.length > 0
            ? state.searchFilters
            : undefined;
    if (!query && !filters) return undefined;
    return { searchQuery: query, searchFilters: filters };
};

const serializeState = (state?: RouteState) => {
    const normalized = normalizeState(state);
    if (!normalized) return '';
    if (isMediaState(normalized)) {
        return `media:${normalized.kind}:${normalized.id}:${normalized.selectedId ?? ''}`;
    }
    const query = normalized.searchQuery ?? '';
    const filters = normalized.searchFilters ?? [];
    if (!query && filters.length === 0) return '';
    return `home:${query}:${serializeFilters(filters)}`;
};

const listeners = new Set<() => void>();
const historyStack: HistoryEntry[] = [];
const MAX_HISTORY = 30;

const emit = () => {
    listeners.forEach((listener) => listener());
};

const getCanGoBack = () => historyStack.length > 1;

const trimHistory = () => {
    if (historyStack.length <= MAX_HISTORY) return;
    historyStack.splice(0, historyStack.length - MAX_HISTORY);
};

const recordRoute = (
    path: string,
    state?: RouteState,
    samePathBehavior: 'replace' | 'push' = 'replace'
) => {
    if (!shouldTrack(path)) return;
    const normalizedState = normalizeState(state);

    const last = historyStack[historyStack.length - 1];
    if (last && last.path === path) {
        const nextState = normalizedState ?? last.state;
        if (serializeState(last.state) !== serializeState(nextState)) {
            if (samePathBehavior === 'push') {
                historyStack.push({ path, state: nextState });
            } else {
                historyStack[historyStack.length - 1] = {
                    path,
                    state: nextState,
                };
            }
            trimHistory();
            emit();
        }
        return;
    }

    historyStack.push({ path, state: normalizedState });
    trimHistory();
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
        (
            path: string,
            state?: RouteState,
            options?: { samePathBehavior?: 'replace' | 'push' }
        ) => {
            const nextState = normalizeState(state);
            const currentState = normalizeState(
                location.state as RouteState | undefined
            );
            const isSamePath = location.pathname === path;
            if (
                isSamePath &&
                serializeState(currentState) === serializeState(nextState)
            ) {
                recordRoute(path, state, options?.samePathBehavior ?? 'push');
                return;
            }
            recordRoute(path, state, options?.samePathBehavior ?? 'push');
            navigate(path, { state, replace: isSamePath });
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
            recordRoute(location.pathname, state, 'replace');
        },
        [location.pathname]
    );

    return {
        canGoBack,
        goBack,
        goTo,
        rememberState,
        maxHistory: MAX_HISTORY,
    };
}
