import { loadAlbumView } from './album';
import { loadArtistView } from './artist';
import type { MediaDataLoadRequest } from './loadContext';
import { loadShowView } from './show';

export {
    ARTIST_DISCOGRAPHY_PAGE_SIZE,
    loadDiscographyEntries,
    mergeDiscographyByAlbumId,
    uniqueAlbumsById,
} from './discography';
export {
    appendDiscographyPage,
    loadArtistDiscographyPage,
    loadShowEpisodePage,
    type ArtistDiscographyPageRequest,
    type LoadedArtistDiscographyPage,
    type LoadedShowEpisodePage,
    type ShowEpisodePageRequest,
} from './pagination';
export { SHOW_EPISODE_PAGE_SIZE } from './show';
export type {
    AlbumViewData,
    ArtistViewData,
    MediaContextRouteState,
    MediaDataState,
    ShowViewData,
    TrackOrEpisodeRouteState,
} from '../model/types';

export async function loadMediaData({ route, context }: MediaDataLoadRequest) {
    if (route.kind === 'album') {
        await loadAlbumView({ route, context });
        return;
    }

    if (route.kind === 'show') {
        await loadShowView({ route, context });
        return;
    }

    await loadArtistView({ route, context });
}
