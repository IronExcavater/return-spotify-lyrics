import { useCallback, useMemo, useState, useEffect } from 'react';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import type { FilterKind, PillValue, SearchFilter } from '../../shared/types';

const SEARCH_DEBOUNCE_MS = 150;

const FILTER_META: Record<
    FilterKind,
    { label: string; buildValue: () => PillValue }
> = {
    artist: {
        label: 'Artist',
        buildValue: () => ({ type: 'text', value: '' }),
    },
    genre: {
        label: 'Genre',
        buildValue: () => ({ type: 'text', value: '' }),
    },
    type: {
        label: 'Type',
        buildValue: () => ({
            type: 'options',
            options: [
                'Track',
                'Album',
                'Artist',
                'Playlist',
                'Show',
                'Episode',
                'Audiobook',
            ],
            value: [],
        }),
    },
    year: {
        label: 'Released',
        buildValue: () => ({ type: 'date', value: '' }),
    },
};

const randomId = () => crypto.randomUUID?.() ?? Math.random().toString(36);

export function useSearch() {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilter[]>([]);
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    const trackSearch = useMemo(() => createAnalyticsTracker('search'), []);

    const available = useMemo(() => {
        const active = new Set(filters.map((filter) => filter.kind));
        return (Object.keys(FILTER_META) as FilterKind[]).filter(
            (kind) => !active.has(kind)
        );
    }, [filters]);

    const addFilter = useCallback(
        (kind: FilterKind) => {
            if (!available.includes(kind)) return;
            const meta = FILTER_META[kind];
            setFilters((prev) => [
                ...prev,
                {
                    id: randomId(),
                    kind,
                    label: meta.label,
                    value: meta.buildValue(),
                },
            ]);
            void trackSearch(ANALYTICS_EVENTS.searchFilterAdd, {
                reason: 'filter added',
                data: { filter: kind },
            });
        },
        [available, trackSearch]
    );

    const updateFilter = useCallback((id: string, value: PillValue) => {
        setFilters((prev) =>
            prev.map((filter) =>
                filter.id === id ? { ...filter, value } : filter
            )
        );
    }, []);

    const removeFilter = useCallback(
        (id: string) => {
            const removed = filters.find((filter) => filter.id === id);
            setFilters((prev) => prev.filter((filter) => filter.id !== id));
            if (removed) {
                void trackSearch(ANALYTICS_EVENTS.searchFilterRemove, {
                    reason: 'filter removed',
                    data: { filter: removed.kind },
                });
            }
        },
        [filters, trackSearch]
    );

    const clearFilters = useCallback(() => {
        if (filters.length) {
            void trackSearch(ANALYTICS_EVENTS.searchFilterClear, {
                reason: 'filters cleared',
                data: { count: filters.length },
            });
        }
        setFilters([]);
    }, [filters, trackSearch]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedQuery(query);
            setDebouncedFilters(filters);
        }, SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeout);
    }, [filters, query]);

    const setSearchState = useCallback(
        (next: { query: string; filters: SearchFilter[] }) => {
            setQuery(next.query);
            setFilters(next.filters);
        },
        []
    );

    return {
        query,
        setQuery,
        filters,
        debouncedQuery,
        debouncedFilters,
        setSearchState,
        addFilter,
        updateFilter,
        removeFilter,
        clearFilters,
        available,
    };
}
