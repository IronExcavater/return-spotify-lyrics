import { useEffect, useMemo, useRef } from 'react';

import type { RouteState, HomeRouteState } from '../hooks/useHistory';
import { type SearchState, useSearch } from '../hooks/useSearch';

export const isHomeRouteState = (
    state: RouteState | null | undefined
): state is HomeRouteState =>
    !!state && ('searchQuery' in state || 'searchFilters' in state);

export const fromHomeRouteState = (
    state: HomeRouteState | null | undefined
): SearchState => ({
    query: state?.searchQuery ?? '',
    filters: state?.searchFilters ?? [],
});

export const toHomeRouteState = ({
    query,
    filters,
}: SearchState): HomeRouteState | undefined => {
    const nextFilters = filters && filters.length > 0 ? filters : undefined;
    if (!query.trim() && !nextFilters) return undefined;

    return {
        searchQuery: query,
        searchFilters: nextFilters,
    };
};

type SearchStateSync = ReturnType<typeof useSearch>;

export function useHomeSearchRouteSync({
    pathname,
    locationState,
    search,
    rememberState,
}: {
    pathname: string;
    locationState: RouteState | null;
    search: SearchStateSync;
    rememberState: (state?: RouteState) => void;
}) {
    const lastHomeStateRef = useRef<HomeRouteState | null>(null);
    const currentHomeState = useMemo(
        () => toHomeRouteState(search.state) ?? null,
        [search.state]
    );
    const debouncedHomeState = useMemo(
        () => toHomeRouteState(search.debouncedState) ?? null,
        [search.debouncedState]
    );

    useEffect(() => {
        if (pathname !== '/home') return;

        search.replaceState(
            fromHomeRouteState(
                isHomeRouteState(locationState) ? locationState : undefined
            )
        );
    }, [locationState, pathname, search.replaceState]);

    useEffect(() => {
        if (pathname !== '/home') return;

        lastHomeStateRef.current = currentHomeState;
    }, [currentHomeState, pathname]);

    useEffect(() => {
        if (pathname !== '/home') return;

        rememberState(debouncedHomeState ?? undefined);
    }, [debouncedHomeState, pathname, rememberState]);

    return lastHomeStateRef;
}

export function useLastContentPath(pathname: string) {
    const lastContentPathRef = useRef('/home');

    useEffect(() => {
        if (pathname === '/profile') return;

        lastContentPathRef.current = pathname;
    }, [pathname]);

    return lastContentPathRef;
}
