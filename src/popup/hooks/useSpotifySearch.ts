import { useEffect, useMemo, useState } from 'react';
import type { PartialSearchResult } from '@spotify/web-api-ts-sdk';
import { sendSpotifyMessage } from '../../shared/messaging';

export type SearchType =
    | 'album'
    | 'artist'
    | 'playlist'
    | 'track'
    | 'show'
    | 'episode';

export type SearchFilters = {
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
};

const DEBOUNCE_MS = 250;

function buildQuery(query: string, filters: SearchFilters) {
    const parts = [];
    const trimmed = query.trim();
    if (trimmed) parts.push(trimmed);
    if (filters.artist?.trim()) parts.push(`artist:${filters.artist.trim()}`);
    if (filters.album?.trim()) parts.push(`album:${filters.album.trim()}`);
    if (filters.year?.trim()) parts.push(`year:${filters.year.trim()}`);
    if (filters.genre?.trim()) parts.push(`genre:${filters.genre.trim()}`);
    return parts.join(' ');
}

export function useSpotifySearch(
    query: string,
    types: SearchType[],
    filters: SearchFilters
) {
    const [results, setResults] = useState<PartialSearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryString = useMemo(
        () => buildQuery(query, filters),
        [query, filters]
    );

    useEffect(() => {
        let active = true;

        if (!queryString || types.length === 0) {
            setResults(null);
            setLoading(false);
            setError(null);
            return () => {
                active = false;
            };
        }

        setLoading(true);
        setError(null);

        const timer = window.setTimeout(() => {
            sendSpotifyMessage('search', {
                query: queryString,
                types,
                limit: 8,
            })
                .then((response) => {
                    if (!active) return;
                    setResults(response ?? null);
                    setLoading(false);
                })
                .catch((err) => {
                    if (!active) return;
                    setError(err?.message ?? 'Search failed.');
                    setResults(null);
                    setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [queryString, types]);

    return {
        results,
        loading,
        error,
    };
}
