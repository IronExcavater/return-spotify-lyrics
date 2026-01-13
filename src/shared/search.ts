import type { SearchFilter } from './types';

export type SearchType =
    | 'track'
    | 'album'
    | 'artist'
    | 'playlist'
    | 'show'
    | 'episode'
    | 'audiobook';

export type SearchContext = {
    active: boolean;
    query: string;
    types: SearchType[];
};

export const DEFAULT_SEARCH_TYPES: SearchType[] = [
    'track',
    'album',
    'artist',
    'playlist',
    'show',
    'episode',
    'audiobook',
];

export const SEARCH_LIMIT = 20;

const toYear = (iso?: string) => {
    if (!iso) return undefined;
    const year = Number(iso.slice(0, 4));
    return Number.isFinite(year) ? year : undefined;
};

export const buildSearchContext = (
    searchQuery: string,
    filters: SearchFilter[]
): SearchContext => {
    const trimmedQuery = searchQuery.trim();
    const parts = new Set<string>();
    const types: SearchType[] = [];

    if (trimmedQuery) parts.add(trimmedQuery);

    filters.forEach((filter) => {
        if (filter.kind === 'artist' && filter.value.type === 'text') {
            const raw = filter.value.value.trim();
            if (!raw) return;
            const safe = raw.replace(/"/g, '');
            parts.add(`artist:"${safe}"`);
            if (!trimmedQuery.includes(raw)) parts.add(raw);
        }

        if (filter.kind === 'genre' && filter.value.type === 'text') {
            const raw = filter.value.value.trim();
            if (!raw) return;
            const safe = raw.replace(/"/g, '');
            parts.add(`genre:"${safe}"`);
            if (!trimmedQuery.includes(raw)) parts.add(raw);
        }

        if (filter.kind === 'type' && filter.value.type === 'options') {
            filter.value.value.forEach((value) => {
                const key = value.trim().toLowerCase();
                if (
                    key === 'track' ||
                    key === 'album' ||
                    key === 'artist' ||
                    key === 'playlist' ||
                    key === 'show' ||
                    key === 'episode' ||
                    key === 'audiobook'
                ) {
                    types.push(key as SearchType);
                }
            });
        }

        if (filter.kind === 'year') {
            if (filter.value.type === 'date') {
                const year = toYear(filter.value.value);
                if (year) parts.add(`year:${year}`);
            }
            if (filter.value.type === 'date-range') {
                const fromYear = toYear(filter.value.value.from);
                const toYearValue = toYear(filter.value.value.to);
                if (fromYear && toYearValue) {
                    parts.add(`year:${fromYear}-${toYearValue}`);
                } else if (fromYear) {
                    parts.add(`year:${fromYear}`);
                } else if (toYearValue) {
                    parts.add(`year:${toYearValue}`);
                }
            }
        }
    });

    const query = Array.from(parts).join(' ').trim();
    const resolvedTypes = types.length
        ? Array.from(new Set(types))
        : DEFAULT_SEARCH_TYPES;

    return {
        active: query.length > 0,
        query,
        types: resolvedTypes,
    };
};
