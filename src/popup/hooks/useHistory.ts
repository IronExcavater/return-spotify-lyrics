import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SearchFilter, PillValue } from '../../shared/types';

export type HomeRouteState = {
    searchQuery?: string;
    searchFilters?: SearchFilter[];
};

export type HistoryEntry = {
    path: string;
    state?: HomeRouteState;
};

const shouldTrack = (path: string) =>
    path === '/home' || path === '/profile' || path.startsWith('/media/');

const valuesEqual = (a: PillValue, b: PillValue) => {
    if (a.type !== b.type) return false;
    if (a.type === 'text' || a.type === 'single-select')
        return a.value === b.value;
    if (a.type === 'number') return a.value === b.value;
    if (a.type === 'multi-select' || a.type === 'options') {
        return (
            a.value.length === b.value.length &&
            a.value.every((value, index) => value === b.value[index])
        );
    }
    if (a.type === 'date') return a.value === b.value;
    return a.value.from === b.value.from && a.value.to === b.value.to;
};

const filtersEqual = (a?: SearchFilter[], b?: SearchFilter[]) => {
    if (a === b) return true;
    if (!a?.length && !b?.length) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((filter, index) => {
        const other = b[index];
        if (!other) return false;
        return (
            filter.id === other.id &&
            filter.kind === other.kind &&
            filter.label === other.label &&
            valuesEqual(filter.value, other.value)
        );
    });
};

const stateEquals = (a?: HomeRouteState, b?: HomeRouteState) =>
    (a?.searchQuery ?? '') === (b?.searchQuery ?? '') &&
    filtersEqual(a?.searchFilters, b?.searchFilters);

const listeners = new Set<() => void>();
const historyStack: HistoryEntry[] = [];

const emit = () => {
    listeners.forEach((listener) => listener());
};

const getCanGoBack = () => historyStack.length > 1;

const recordRoute = (path: string, state?: HomeRouteState) => {
    if (!shouldTrack(path)) return;

    const last = historyStack[historyStack.length - 1];
    if (last && last.path === path) {
        if (!stateEquals(last.state, state)) {
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
            location.state as HomeRouteState | undefined
        );
    }, [location.pathname, location.state]);

    const goTo = useCallback(
        (path: string, state?: HomeRouteState) => {
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
        (state?: HomeRouteState) => {
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
