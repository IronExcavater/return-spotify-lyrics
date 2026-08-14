import { queryOptions } from '@tanstack/react-query';

import { sendMessage } from '@/platform/messaging';

export const searchKeys = {
    all: ['spotify', 'search'] as const,
    tracks: (query: string) => ['spotify', 'search', 'tracks', query] as const,
};

export function trackSearchQueryOptions(query: string) {
    const normalized = query.trim();

    return queryOptions({
        queryKey: searchKeys.tracks(normalized),
        queryFn: () =>
            sendMessage('spotifySearch', { query: normalized, limit: 5 }),
        enabled: normalized.length > 0,
        staleTime: 60_000,
        retry: false,
    });
}
