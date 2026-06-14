import type { SearchType } from '../../../shared/search';
import { SEARCH_SECTION_BASE } from './searchSections';

export type SectionStatus = { loading: boolean; error: string | null };
export type SectionMode = 'home' | 'search';
export type StatusByMode = Record<SectionMode, Record<string, SectionStatus>>;

export const SEARCH_TYPE_BY_SECTION_ID: Record<string, SearchType> =
    Object.fromEntries(
        (Object.keys(SEARCH_SECTION_BASE) as SearchType[]).map((type) => [
            SEARCH_SECTION_BASE[type].id,
            type,
        ])
    ) as Record<string, SearchType>;

export function describeRpcError(error: unknown) {
    if (error instanceof Error) return error.message || 'Request failed.';
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
    ) {
        return (error as { message: string }).message || 'Request failed.';
    }
    if (typeof error === 'string' && error.trim().length > 0) return error;
    return 'Request failed.';
}

export function createSearchOffsets(): Record<SearchType, number | null> {
    return {
        track: 0,
        album: 0,
        artist: 0,
        playlist: 0,
        show: 0,
        episode: 0,
        audiobook: 0,
    };
}
