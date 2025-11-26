import { Episode, Track } from '@spotify/web-api-ts-sdk';

export function asTrack(item: Track | Episode | undefined): Track | undefined {
    return item && item.type === 'track' ? (item as Track) : undefined;
}

export function asEpisode(
    item: Track | Episode | undefined
): Episode | undefined {
    return item && item.type === 'episode' ? (item as Episode) : undefined;
}
