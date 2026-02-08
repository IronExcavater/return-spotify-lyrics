import type {
    SimplifiedEpisode,
    SimplifiedTrack,
} from '@spotify/web-api-ts-sdk';

export const sumDurationMs = (
    items: Array<{ duration_ms?: number | null | undefined }>
) => items.reduce((acc, item) => acc + (item?.duration_ms ?? 0), 0);

export const buildTrackLookup = (tracks: SimplifiedTrack[]) =>
    tracks.reduce(
        (acc, track) => {
            const key = track.id ?? track.uri;
            if (key) acc[key] = track;
            return acc;
        },
        {} as Record<string, SimplifiedTrack>
    );

export const buildEpisodeLookup = (episodes: SimplifiedEpisode[]) =>
    episodes.reduce(
        (acc, episode) => {
            const key = episode.id ?? episode.uri;
            if (key) acc[key] = episode;
            return acc;
        },
        {} as Record<string, SimplifiedEpisode>
    );
