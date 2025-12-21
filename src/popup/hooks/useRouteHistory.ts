import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type HomeRouteState = {
    searchQuery?: string;
};

type RouteEntry = {
    path: string;
    state?: HomeRouteState;
};

const shouldTrack = (path: string) =>
    path === '/home' || path === '/profile' || path.startsWith('/media/');

const stateEquals = (a?: HomeRouteState, b?: HomeRouteState) =>
    a?.searchQuery === b?.searchQuery;

const listeners = new Set<() => void>();
const historyStack: RouteEntry[] = [];

const emit = () => {
    listeners.forEach((listener) => listener());
};

const getCanGoBack = () => historyStack.length > 1;

const recordRoute = (path: string, state?: HomeRouteState) => {
    if (!shouldTrack(path)) return;

    const last = historyStack[historyStack.length - 1];
    if (last && last.path === path) {
        const nextState = state ?? last.state;
        if (!stateEquals(last.state, nextState)) {
            historyStack[historyStack.length - 1] = {
                path,
                state: nextState,
            };
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

export function useRouteHistory() {
    const navigate = useNavigate();
    const location = useLocation();
    const [canGoBack, setCanGoBack] = useState(getCanGoBack());
    const lastLocation = useRef<string | null>(null);

    useEffect(() => {
        const update = () => setCanGoBack(getCanGoBack());
        listeners.add(update);
        return () => listeners.delete(update);
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

    const goBack = useCallback(() => {
        const previous = popRoute();
        if (!previous) return;
        navigate(previous.path, { state: previous.state, replace: true });
    }, [navigate]);

    return {
        canGoBack,
        goBack,
        goTo,
    };
}
