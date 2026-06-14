import type { Market } from '@spotify/web-api-ts-sdk';

import { resolveSpotifyMediaId } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import type { MediaRouteState } from '../../../hooks/useMediaRoute';
import type {
    MediaContextRouteState,
    MediaDataState,
    TrackOrEpisodeRouteState,
} from '../data';

type GoToMedia = (
    path: '/media',
    state?: MediaRouteState,
    options?: { samePathBehavior?: 'replace' | 'push' }
) => void;

export function isTrackOrEpisodeRoute(
    routeState: MediaRouteState | null
): routeState is TrackOrEpisodeRouteState {
    return Boolean(
        routeState &&
            (routeState.kind === 'track' || routeState.kind === 'episode')
    );
}

export function isMediaContextRoute(
    routeState: MediaRouteState | null
): routeState is MediaContextRouteState {
    return Boolean(
        routeState &&
            (routeState.kind === 'album' ||
                routeState.kind === 'show' ||
                routeState.kind === 'artist')
    );
}

export function resolveFromLoadedMediaData(
    data: MediaDataState | null,
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) {
    if (state.kind === 'track' && data?.kind === 'album') {
        return resolveTrackFromLoadedAlbum(data, state, goTo);
    }

    if (state.kind === 'episode' && data?.kind === 'show') {
        return resolveEpisodeFromLoadedShow(data, state, goTo);
    }

    return false;
}

export async function resolveMediaContextFromApi({
    state,
    market,
    goTo,
}: {
    state: TrackOrEpisodeRouteState;
    market: Market;
    goTo: GoToMedia;
}) {
    if (state.kind === 'track') {
        await resolveTrackContextFromApi(state, goTo);
        return;
    }

    await resolveEpisodeContextFromApi({ state, market, goTo });
}

function resolveTrackFromLoadedAlbum(
    data: Extract<MediaDataState, { kind: 'album' }>,
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) {
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

function resolveEpisodeFromLoadedShow(
    data: Extract<MediaDataState, { kind: 'show' }>,
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) {
    const resolvedId = resolveSpotifyMediaId(state.id);
    const episode =
        data.episodeLookup[resolvedId] ?? data.episodeLookup[state.id] ?? null;
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

async function resolveTrackContextFromApi(
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) {
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
}

async function resolveEpisodeContextFromApi({
    state,
    market,
    goTo,
}: {
    state: TrackOrEpisodeRouteState;
    market: Market;
    goTo: GoToMedia;
}) {
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
}
