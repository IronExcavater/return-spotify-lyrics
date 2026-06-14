import type { Market, Show } from '@spotify/web-api-ts-sdk';

import { formatIsoDate } from '../../../../shared/date';
import { showEpisodeToItem, showToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import { buildEpisodeLookup, sumDurationMs } from '../../../utils/mediaLookup';
import {
    buildShowRecommendationQuery,
    searchItems,
} from '../../../utils/mediaSearch';
import {
    patchByKind,
    setIfFresh,
    type IsStale,
    type SetMediaData,
} from './loadContext';

export const SHOW_EPISODE_PAGE_SIZE = 30;

export async function loadShowData({
    id,
    selectedId,
    market,
    locale,
    setData,
    isStale,
    logSearchError,
}: {
    id: string;
    selectedId?: string;
    market: Market;
    locale: string;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) {
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
    const selectedEpisode = selectedId
        ? (episodeLookup[selectedId] ?? null)
        : null;
    const nextOffset = episodesPage.items.length;
    const episodesHasMore = nextOffset < (episodesPage.total ?? nextOffset);

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
        setData,
        isStale,
        logSearchError,
    });
}

async function loadShowRecommendations({
    show,
    setData,
    isStale,
    logSearchError,
}: {
    show: Show;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) {
    const query = buildShowRecommendationQuery({
        showName: show.name,
        publisher: show.publisher,
    });

    const recommended = await searchItems(
        query,
        ['show'],
        (results) =>
            (results.shows?.items ?? [])
                .filter(
                    (item): item is Show =>
                        typeof item === 'object' && item !== null
                )
                .filter((item) => item.id && item.id !== show.id)
                .map(showToItem),
        logSearchError
    );

    patchByKind(isStale, setData, 'show', (prev) => ({
        ...prev,
        recommended,
        recommendedLoading: false,
    }));
}
