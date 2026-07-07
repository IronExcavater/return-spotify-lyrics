import type { Market, Show } from '@spotify/web-api-ts-sdk';

import {
    showEpisodeToItem,
    type AlbumTrackGroup,
} from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import { buildEpisodeLookup, sumDurationMs } from '../../../utils/mediaLookup';
import {
    ARTIST_DISCOGRAPHY_PAGE_SIZE,
    loadDiscographyEntries,
    mergeDiscographyByAlbumId,
    uniqueAlbumsById,
} from './discography';
import { getPageProgress } from './page';
import { SHOW_EPISODE_PAGE_SIZE } from './show';

export type ShowEpisodePageRequest = {
    show: Show;
    offset: number;
    market: Market;
    locale: string;
};

export type LoadedShowEpisodePage = {
    episodes: ReturnType<typeof showEpisodeToItem>[];
    episodeLookup: ReturnType<typeof buildEpisodeLookup>;
    durationMs: number;
    nextOffset: number;
    hasMore: boolean;
};

export async function loadShowEpisodePage({
    show,
    offset,
    market,
    locale,
}: ShowEpisodePageRequest): Promise<LoadedShowEpisodePage> {
    const page = await sendSpotifyMessage('getShowEpisodes', {
        id: show.id,
        market,
        limit: SHOW_EPISODE_PAGE_SIZE,
        offset,
    });
    const { hasMore, nextOffset } = getPageProgress({
        itemCount: page.items.length,
        offset,
        total: page.total,
    });

    return {
        episodes: page.items.map((episode) =>
            showEpisodeToItem(episode, show, locale)
        ),
        episodeLookup: buildEpisodeLookup(page.items),
        durationMs: sumDurationMs(page.items),
        nextOffset,
        hasMore,
    };
}

export type ArtistDiscographyPageRequest = {
    artistId: string;
    offset: number;
    market: Market;
    trackCount: number;
    includeAppearances: boolean;
};

export type LoadedArtistDiscographyPage = {
    entries: AlbumTrackGroup[];
    nextOffset: number;
    hasMore: boolean;
};

export async function loadArtistDiscographyPage({
    artistId,
    offset,
    market,
    trackCount,
    includeAppearances,
}: ArtistDiscographyPageRequest): Promise<LoadedArtistDiscographyPage> {
    const page = await sendSpotifyMessage('getArtistAlbums', {
        id: artistId,
        market,
        limit: ARTIST_DISCOGRAPHY_PAGE_SIZE,
        offset,
        includeAppearances,
    });
    const albums = uniqueAlbumsById(page.items);
    const entries = await loadDiscographyEntries({
        albums,
        market,
        trackCount,
    });
    const { hasMore, nextOffset } = getPageProgress({
        itemCount: page.items.length,
        offset,
        total: page.total,
    });

    return {
        entries,
        nextOffset,
        hasMore,
    };
}

export const appendDiscographyPage = (
    current: AlbumTrackGroup[],
    page: LoadedArtistDiscographyPage
) => mergeDiscographyByAlbumId(current, page.entries);
