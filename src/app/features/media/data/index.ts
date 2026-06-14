import { loadAlbumData } from './album';
import { loadArtistData } from './artist';
import type { MediaDataLoadContext } from './loadContext';
import { loadShowData } from './show';
import type { MediaContextRouteState } from './types';

export {
    ARTIST_DISCOGRAPHY_PAGE_SIZE,
    buildDiscographyEntries,
    dedupeAlbums,
    mergeDiscographyEntries,
} from './discography';
export { SHOW_EPISODE_PAGE_SIZE } from './show';
export type {
    AlbumViewData,
    ArtistViewData,
    MediaContextRouteState,
    MediaDataState,
    ShowViewData,
    TrackOrEpisodeRouteState,
} from './types';

export async function loadMediaContextData(
    routeState: MediaContextRouteState,
    context: MediaDataLoadContext
) {
    const {
        market,
        locale,
        discographyTrackCount,
        setData,
        isStale,
        logSearchError,
    } = context;

    if (routeState.kind === 'album') {
        await loadAlbumData({
            id: routeState.id,
            selectedId: routeState.selectedId,
            market,
            setData,
            isStale,
            logSearchError,
        });
        return;
    }

    if (routeState.kind === 'show') {
        await loadShowData({
            id: routeState.id,
            selectedId: routeState.selectedId,
            market,
            locale,
            setData,
            isStale,
            logSearchError,
        });
        return;
    }

    await loadArtistData({
        id: routeState.id,
        market,
        discographyTrackCount,
        setData,
        isStale,
        logSearchError,
    });
}
