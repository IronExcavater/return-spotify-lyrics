import type { Market } from '@spotify/web-api-ts-sdk';

import { resolveSpotifyMediaId } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import type {
    MediaContextRouteState,
    MediaDataState,
    TrackOrEpisodeRouteState,
} from './types';

type GoToMedia = (
    path: '/media',
    state?: MediaRouteState,
    options?: { samePathBehavior?: 'replace' | 'push' }
) => void;

export const isTrackOrEpisodeRoute = (
    routeState: MediaRouteState | null
): routeState is TrackOrEpisodeRouteState =>
    Boolean(
        routeState &&
            (routeState.kind === 'track' || routeState.kind === 'episode')
    );

export const isMediaContextRoute = (
    routeState: MediaRouteState | null
): routeState is MediaContextRouteState =>
    Boolean(
        routeState &&
            (routeState.kind === 'album' ||
                routeState.kind === 'show' ||
                routeState.kind === 'artist')
    );

export const resolveFromLoadedMediaData = (
    data: MediaDataState | null,
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) => {
    if (state.kind === 'track' && data?.kind === 'album') {
        const resolvedId = resolveSpotifyMediaId(state.id);
        const track =
            data.trackLookup[resolvedId] ?? data.trackLookup[state.id] ?? null;
        if (!track) return false;

        goTo(
            '/media',
            {
                kind: 'album',
                id: data.album.id,
                selectedId: track.id ?? track.uri ?? resolvedId,
                singleTrack: data.album.total_tracks === 1,
            },
            { samePathBehavior: 'replace' }
        );
        return true;
    }

    if (state.kind === 'episode' && data?.kind === 'show') {
        const resolvedId = resolveSpotifyMediaId(state.id);
        const episode =
            data.episodeLookup[resolvedId] ??
            data.episodeLookup[state.id] ??
            null;
        if (!episode) return false;

        goTo(
            '/media',
            {
                kind: 'show',
                id: data.show.id,
                selectedId: episode.id ?? episode.uri ?? resolvedId,
            },
            { samePathBehavior: 'replace' }
        );
        return true;
    }

    return false;
};

export const resolveMediaContextFromApi = async ({
    state,
    market,
    goTo,
}: {
    state: TrackOrEpisodeRouteState;
    market: Market;
    goTo: GoToMedia;
}) => {
    if (state.kind === 'track') {
        const id = resolveSpotifyMediaId(state.id);
        const track = await sendSpotifyMessage('getTrack', { id });
        if (!track.album?.id) return;

        goTo(
            '/media',
            {
                kind: 'album',
                id: track.album.id,
                selectedId: track.id,
                singleTrack: track.album.total_tracks === 1,
            },
            { samePathBehavior: 'replace' }
        );
        return;
    }

    const id = resolveSpotifyMediaId(state.id);
    const episode = await sendSpotifyMessage('getEpisode', { id, market });
    if (!episode.show?.id) return;

    goTo(
        '/media',
        {
            kind: 'show',
            id: episode.show.id,
            selectedId: episode.id,
        },
        { samePathBehavior: 'replace' }
    );
};
