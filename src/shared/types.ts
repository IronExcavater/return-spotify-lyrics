import { Episode, Track } from '@spotify/web-api-ts-sdk';

export type PillValue =
    | { type: 'text'; value: string }
    | { type: 'single-select'; value: string }
    | { type: 'multi-select'; value: string[] }
    | { type: 'number'; value: number | null }
    | { type: 'date'; value: string }
    | { type: 'date-range'; value: { from?: string; to?: string } }
    | { type: 'options'; value: string[]; options: string[] };

export type FilterKind = 'artist' | 'genre' | 'type' | 'year';

export type SearchFilter = {
    id: string;
    kind: FilterKind;
    label: string;
    value: PillValue;
};

export type MediaItem = {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
};

export function asTrack(item: Track | Episode | undefined): Track | undefined {
    return item && item.type === 'track' ? (item as Track) : undefined;
}

export function asEpisode(
    item: Track | Episode | undefined
): Episode | undefined {
    return item && item.type === 'episode' ? (item as Episode) : undefined;
}
