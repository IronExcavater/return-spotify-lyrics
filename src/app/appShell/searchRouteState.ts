import { useEffect, useMemo, useRef } from 'react';

import type { RouteState, HomeRouteState } from '../hooks/useHistory';
import { useSearch } from '../hooks/useSearch';

const isHomeRouteState = (
    state: RouteState | null | undefined
): state is HomeRouteState =>
    !!state && ('searchQuery' in state || 'searchFilters' in state);

export const toHomeRouteState = (
    query: string,
    filters: HomeRouteState['searchFilters'] = []
): HomeRouteState | undefined => {
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
        () => toHomeRouteState(search.query, search.filters) ?? null,
        [search.filters, search.query]
    );
    const debouncedHomeState = useMemo(
        () =>
            toHomeRouteState(search.debouncedQuery, search.debouncedFilters) ??
            null,
        [search.debouncedFilters, search.debouncedQuery]
    );

    useEffect(() => {
        if (pathname !== '/home') return;
        if (!isHomeRouteState(locationState)) return;

        search.setSearchState({
            query: locationState.searchQuery ?? '',
            filters: locationState.searchFilters ?? [],
        });
    }, [locationState, pathname, search.setSearchState]);

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
