import { useCallback, useEffect, useRef, useState } from 'react';
import type { Market } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../shared/logging';

export { resolveSpotifyMediaId as resolveMediaDataId } from '../../shared/media';
import { showEpisodeToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import {
    ARTIST_DISCOGRAPHY_PAGE_SIZE,
    SHOW_EPISODE_PAGE_SIZE,
    buildDiscographyEntries,
    dedupeAlbums,
    loadMediaContextData,
    mergeDiscographyEntries,
} from '../mediaData/loaders';
import {
    isMediaContextRoute,
    isTrackOrEpisodeRoute,
    resolveFromLoadedMediaData,
    resolveMediaContextFromApi,
} from '../mediaData/routeResolution';
import type { MediaDataState } from '../mediaData/types';
import { buildEpisodeLookup, sumDurationMs } from '../utils/mediaLookup';
import type { MediaRouteState } from './useMediaRoute';

export type { MediaDataState };

const logger = createLogger('media');

type GoToMedia = (
    path: '/media',
    state?: MediaRouteState,
    options?: { samePathBehavior?: 'replace' | 'push' }
) => void;

type UseMediaDataOptions = {
    state: MediaRouteState | null;
    market: Market;
    locale: string;
    goTo: GoToMedia;
    discographyTrackCount?: number;
};

export function useMediaData({
    state,
    market,
    locale,
    goTo,
    discographyTrackCount = 5,
}: UseMediaDataOptions) {
    const [data, setData] = useState<MediaDataState | null>(null);
    const [loading, setLoading] = useState(true);

    const dataRef = useRef<MediaDataState | null>(null);
    const loadRequestIdRef = useRef(0);

    const logSearchError = useCallback((error: unknown) => {
        logError(logger, 'search failed', error);
    }, []);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        if (!isTrackOrEpisodeRoute(state) || !state.id) return;

        if (resolveFromLoadedMediaData(data, state, goTo)) return;

        let cancelled = false;

        void (async () => {
            try {
                await resolveMediaContextFromApi({ state, market, goTo });
            } catch (error) {
                if (cancelled) return;
                logError(logger, 'Failed to resolve context', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [data, goTo, market, state]);

    useEffect(() => {
        if (!state?.id || !state.kind) {
            setData(null);
            setLoading(false);
            return;
        }

        if (isTrackOrEpisodeRoute(state)) {
            if (!dataRef.current) {
                setData(null);
                setLoading(true);
            }
            return;
        }

        if (!isMediaContextRoute(state)) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        const requestId = loadRequestIdRef.current + 1;
        loadRequestIdRef.current = requestId;

        const isStale = () =>
            cancelled || loadRequestIdRef.current !== requestId;

        setData(null);
        setLoading(true);

        void (async () => {
            try {
                await loadMediaContextData(state, {
                    market,
                    locale,
                    discographyTrackCount,
                    setData,
                    isStale,
                    logSearchError,
                });
            } finally {
                if (!isStale()) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        discographyTrackCount,
        locale,
        logSearchError,
        market,
        state?.id,
        state?.kind,
    ]);

    const loadMoreEpisodes = useCallback(async () => {
        let offset: number | null = null;

        setData((prev) => {
            if (!prev || prev.kind !== 'show') return prev;
            if (prev.episodesLoadingMore || !prev.episodesHasMore) return prev;
            offset = prev.episodesOffset;
            return { ...prev, episodesLoadingMore: true };
        });

        if (offset == null || !state?.id) return;

        try {
            const page = await sendSpotifyMessage('getShowEpisodes', {
                id: state.id,
                market,
                limit: SHOW_EPISODE_PAGE_SIZE,
                offset,
            });

            const addedDuration = sumDurationMs(page.items);
            setData((prev) => {
                if (!prev || prev.kind !== 'show') return prev;
                if (prev.episodesOffset !== offset) {
                    return { ...prev, episodesLoadingMore: false };
                }

                const episodes = page.items.map((episode) =>
                    showEpisodeToItem(episode, prev.show, locale)
                );
                const lookup = buildEpisodeLookup(page.items);
                const nextOffset = offset + page.items.length;
                const hasMore = nextOffset < (page.total ?? nextOffset);

                return {
                    ...prev,
                    episodes: [...prev.episodes, ...episodes],
                    episodeLookup: { ...prev.episodeLookup, ...lookup },
                    totalDurationMs: prev.totalDurationMs + addedDuration,
                    episodesOffset: nextOffset,
                    episodesHasMore: hasMore,
                    episodesLoadingMore: false,
                };
            });
        } catch (error) {
            logError(logger, 'Failed to load more episodes', error);
            setData((prev) => {
                if (!prev || prev.kind !== 'show') return prev;
                return { ...prev, episodesLoadingMore: false };
            });
        }
    }, [locale, market, state?.id]);

    const loadMoreDiscography = useCallback(async () => {
        let offset: number | null = null;

        setData((prev) => {
            if (!prev || prev.kind !== 'artist') return prev;
            if (prev.discographyLoadingMore || !prev.discographyHasMore) {
                return prev;
            }
            offset = prev.discographyOffset;
            return { ...prev, discographyLoadingMore: true };
        });

        if (offset == null || !state?.id) return;

        try {
            const page = await sendSpotifyMessage('getArtistAlbums', {
                id: state.id,
                market,
                limit: ARTIST_DISCOGRAPHY_PAGE_SIZE,
                offset,
            });

            const albums = dedupeAlbums(page.items ?? []);
            const discography = await buildDiscographyEntries(
                albums,
                market,
                discographyTrackCount
            );
            const nextOffset = offset + (page.items?.length ?? 0);
            const hasMore = nextOffset < (page.total ?? nextOffset);

            setData((prev) => {
                if (!prev || prev.kind !== 'artist') return prev;
                if (prev.discographyOffset !== offset) {
                    return { ...prev, discographyLoadingMore: false };
                }

                return {
                    ...prev,
                    discography: mergeDiscographyEntries(
                        prev.discography,
                        discography
                    ),
                    discographyOffset: nextOffset,
                    discographyHasMore: hasMore,
                    discographyLoadingMore: false,
                };
            });
        } catch (error) {
            logError(logger, 'Failed to load more discography', error);
            setData((prev) => {
                if (!prev || prev.kind !== 'artist') return prev;
                return { ...prev, discographyLoadingMore: false };
            });
        }
    }, [discographyTrackCount, market, state?.id]);

    return {
        data,
        loading,
        loadMoreDiscography,
        loadMoreEpisodes,
    };
}
