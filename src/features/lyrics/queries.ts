import { queryOptions } from '@tanstack/react-query';

import type { LyricsLookup, LyricsSearch } from '@/integrations/lrclib/types';
import { sendMessage } from '@/platform/messaging';

export const lyricsKeys = {
    all: ['lyrics'] as const,
    lookup: (input: LyricsLookup) => ['lyrics', 'lookup', input] as const,
    search: (input: LyricsSearch) => ['lyrics', 'search', input] as const,
};

export function lyricsQueryOptions(input: LyricsLookup) {
    return queryOptions({
        queryKey: lyricsKeys.lookup(input),
        queryFn: () => sendMessage('lyricsGet', input),
        staleTime: 24 * 60 * 60_000,
        retry: false,
    });
}

export function lyricsSearchQueryOptions(input: LyricsSearch) {
    const enabled = Boolean(
        input.query?.trim() || input.trackName?.trim() || input.artistName?.trim()
    );

    return queryOptions({
        queryKey: lyricsKeys.search(input),
        queryFn: () => sendMessage('lyricsSearch', input),
        enabled,
        staleTime: 10 * 60_000,
        retry: false,
    });
}
