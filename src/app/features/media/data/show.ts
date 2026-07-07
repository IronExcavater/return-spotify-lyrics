import type { Show } from '@spotify/web-api-ts-sdk';

import { formatIsoDate } from '../../../../shared/date';
import { showEpisodeToItem, showToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    buildEpisodeLookup,
    findByMediaId,
    sumDurationMs,
} from '../../../utils/mediaLookup';
import {
    createShowSearchQuery,
    isSearchResultItem,
    searchMediaItems,
} from '../../../utils/mediaSearch';
import type { MediaContextRouteState } from '../model/types';
import {
    patchByKind,
    setIfFresh,
    type MediaDataLoadContext,
} from './loadContext';
import { getPageProgress } from './page';

export const SHOW_EPISODE_PAGE_SIZE = 30;

type ShowLoadRequest = {
    route: Extract<MediaContextRouteState, { kind: 'show' }>;
    context: MediaDataLoadContext;
};

export async function loadShowView({ route, context }: ShowLoadRequest) {
    const { id, selectedId } = route;
    const { market, locale, setData, isStale } = context;

    const [show, episodesPage] = await Promise.all([
        sendSpotifyMessage('getShow', { id, market }),
        sendSpotifyMessage('getShowEpisodes', {
            id,
            market,
            limit: SHOW_EPISODE_PAGE_SIZE,
        }),
    ]);
    if (isStale()) return;

    const episodeLookup = buildEpisodeLookup(episodesPage.items);
    const selectedEpisode = findByMediaId(episodeLookup, selectedId);
    const { hasMore: episodesHasMore, nextOffset } = getPageProgress({
        itemCount: episodesPage.items.length,
        offset: 0,
        total: episodesPage.total,
    });

    setIfFresh(isStale, setData, {
        kind: 'show',
        show,
        episodes: episodesPage.items.map((episode) =>
            showEpisodeToItem(episode, show, locale)
        ),
        episodeLookup,
        totalDurationMs: sumDurationMs(episodesPage.items),
        selectedId,
        selectedEpisode,
        releaseYear: formatIsoDate(
            episodesPage.items[0]?.release_date,
            { year: 'numeric' },
            locale
        ),
        episodesOffset: nextOffset,
        episodesHasMore,
        episodesLoadingMore: false,
        recommended: [],
        recommendedLoading: true,
    });

    void loadShowRecommendations({
        show,
        context,
    });
}

async function loadShowRecommendations({
    show,
    context,
}: {
    show: Show;
    context: MediaDataLoadContext;
}) {
    const { setData, isStale, logSearchError } = context;
    const query = createShowSearchQuery({
        showName: show.name,
        publisher: show.publisher,
    });

    const recommended = await searchMediaItems({
        query,
        types: ['show'],
        select: (results) =>
            (results.shows?.items ?? [])
                .filter(isSearchResultItem<Show>)
                .filter((item) => item.id && item.id !== show.id)
                .map(showToItem),
        onError: logSearchError,
    });

    patchByKind(isStale, setData, 'show', (prev) => ({
        ...prev,
        recommended,
        recommendedLoading: false,
    }));
}
