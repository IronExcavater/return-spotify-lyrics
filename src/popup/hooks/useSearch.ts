import { useCallback, useMemo, useState } from 'react';
import { type PillValue } from '../components/Pill';

export type FilterKind = 'artist' | 'mood' | 'type' | 'date' | 'range';

export type SearchFilter = {
    id: string;
    kind: FilterKind;
    label: string;
    value: PillValue;
};

const FILTER_META: Record<
    FilterKind,
    { label: string; buildValue: () => PillValue }
> = {
    artist: {
        label: 'Artist',
        buildValue: () => ({ type: 'text', value: '' }),
    },
    mood: {
        label: 'Mood',
        buildValue: () => ({ type: 'text', value: '' }),
    },
    type: {
        label: 'Type',
        buildValue: () => ({
            type: 'options',
            options: ['Track', 'Album', 'Artist', 'Playlist'],
            value: [],
        }),
    },
    date: {
        label: 'Date',
        buildValue: () => ({ type: 'date', value: '' }),
    },
    range: {
        label: 'Range',
        buildValue: () => ({ type: 'date-range', value: {} }),
    },
};

const randomId = () => crypto.randomUUID?.() ?? Math.random().toString(36);

export function useSearch() {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilter[]>([]);

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
        },
        [available]
    );

    const updateFilter = useCallback((id: string, value: PillValue) => {
        setFilters((prev) =>
            prev.map((filter) =>
                filter.id === id ? { ...filter, value } : filter
            )
        );
    }, []);

    const removeFilter = useCallback((id: string) => {
        setFilters((prev) => prev.filter((filter) => filter.id !== id));
    }, []);

    const clearFilters = useCallback(() => setFilters([]), []);

    return {
        query,
        setQuery,
        filters,
        addFilter,
        updateFilter,
        removeFilter,
        clearFilters,
        available,
    };
}
