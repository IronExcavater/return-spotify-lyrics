import type { MediaRouteState } from '../../../hooks/useMediaRoute';
import type { MediaDataState } from '../data';

export function matchesMediaState(
    data: MediaDataState | null,
    state: MediaRouteState | null,
    isResolvingRoute: boolean
) {
    if (!data || !state?.id || !state.kind || isResolvingRoute) return false;
    if (data.kind === 'album') {
        return state.kind === 'album' && data.album.id === state.id;
    }
    if (data.kind === 'show') {
        return state.kind === 'show' && data.show.id === state.id;
    }
    if (data.kind === 'artist') {
        return state.kind === 'artist' && data.artist.id === state.id;
    }
    return false;
}

function selectFromLookup<T>(
    lookup: Record<string, T>,
    selectedId?: string,
    resolvedSelectedId?: string
): T | null {
    if (!resolvedSelectedId) return null;
    return lookup[resolvedSelectedId] ?? lookup[selectedId ?? ''] ?? null;
}

export function findSelectedTrack(
    viewData: MediaDataState | null,
    selectedId?: string,
    resolvedSelectedId?: string
) {
    if (!viewData || viewData.kind !== 'album') return null;
    return selectFromLookup(
        viewData.trackLookup,
        selectedId,
        resolvedSelectedId
    );
}

export function findSelectedEpisode(
    viewData: MediaDataState | null,
    selectedId?: string,
    resolvedSelectedId?: string
) {
    if (!viewData || viewData.kind !== 'show') return null;
    return selectFromLookup(
        viewData.episodeLookup,
        selectedId,
        resolvedSelectedId
    );
}

export function getActiveMediaKind(
    viewData: MediaDataState | null,
    state: MediaRouteState | null
) {
    if (viewData) return viewData.kind;
    if (state?.kind === 'track') return 'album';
    if (state?.kind === 'episode') return 'show';
    return state?.kind;
}
