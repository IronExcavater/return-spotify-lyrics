import { useCallback, useEffect, useRef, useState } from 'react';
import type { Market } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../../../shared/logging';
import type { MediaRouteState } from '../../../hooks/useMediaRoute';
import {
    appendDiscographyPage,
    loadArtistDiscographyPage,
    loadMediaData,
    loadShowEpisodePage,
    type ArtistViewData,
    type MediaDataState,
    type ShowViewData,
} from '../data';
import {
    isMediaContextRoute,
    isTrackOrEpisodeRoute,
    resolveFromLoadedMediaData,
    resolveMediaContextFromApi,
} from '../routing/contextResolution';

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
    discographyIncludeAppearances?: boolean;
};

type ShowEpisodeCursor = {
    show: ShowViewData['show'];
    offset: number;
};

type ArtistDiscographyCursor = {
    artist: ArtistViewData['artist'];
    offset: number;
};

export function useMediaData({
    state,
    market,
    locale,
    goTo,
    discographyTrackCount = 5,
    discographyIncludeAppearances = false,
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
                await loadMediaData({
                    route: state,
                    context: {
                        market,
                        locale,
                        discography: {
                            trackCount: discographyTrackCount,
                            includeAppearances: discographyIncludeAppearances,
                        },
                        setData,
                        isStale,
                        logSearchError,
                    },
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
        discographyIncludeAppearances,
        locale,
        logSearchError,
        market,
        state?.id,
        state?.kind,
        state?.selectedId,
    ]);

    const loadMoreEpisodes = useCallback(async () => {
        const current = dataRef.current;
        if (
            !current ||
            current.kind !== 'show' ||
            current.episodesLoadingMore ||
            !current.episodesHasMore
        ) {
            return;
        }

        const cursor: ShowEpisodeCursor = {
            show: current.show,
            offset: current.episodesOffset,
        };

        setData((prev) => {
            if (!prev || prev.kind !== 'show') return prev;
            if (
                prev.show.id !== cursor.show.id ||
                prev.episodesOffset !== cursor.offset ||
                prev.episodesLoadingMore ||
                !prev.episodesHasMore
            ) {
                return prev;
            }
            return { ...prev, episodesLoadingMore: true };
        });

        try {
            const page = await loadShowEpisodePage({
                show: cursor.show,
                offset: cursor.offset,
                market,
                locale,
            });

            setData((prev) => {
                if (!prev || prev.kind !== 'show') return prev;
                if (prev.show.id !== cursor.show.id) return prev;
                if (prev.episodesOffset !== cursor.offset) {
                    return { ...prev, episodesLoadingMore: false };
                }

                return {
                    ...prev,
                    episodes: [...prev.episodes, ...page.episodes],
                    episodeLookup: {
                        ...prev.episodeLookup,
                        ...page.episodeLookup,
                    },
                    totalDurationMs: prev.totalDurationMs + page.durationMs,
                    episodesOffset: page.nextOffset,
                    episodesHasMore: page.hasMore,
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
    }, [locale, market]);

    const loadMoreDiscography = useCallback(async () => {
        const current = dataRef.current;
        if (
            !current ||
            current.kind !== 'artist' ||
            current.discographyLoadingMore ||
            !current.discographyHasMore
        ) {
            return;
        }

        const cursor: ArtistDiscographyCursor = {
            artist: current.artist,
            offset: current.discographyOffset,
        };

        setData((prev) => {
            if (!prev || prev.kind !== 'artist') return prev;
            if (
                prev.artist.id !== cursor.artist.id ||
                prev.discographyOffset !== cursor.offset ||
                prev.discographyLoadingMore ||
                !prev.discographyHasMore
            ) {
                return prev;
            }
            return { ...prev, discographyLoadingMore: true };
        });

        try {
            const page = await loadArtistDiscographyPage({
                artistId: cursor.artist.id,
                offset: cursor.offset,
                market,
                trackCount: discographyTrackCount,
                includeAppearances: discographyIncludeAppearances,
            });

            setData((prev) => {
                if (!prev || prev.kind !== 'artist') return prev;
                if (prev.artist.id !== cursor.artist.id) return prev;
                if (prev.discographyOffset !== cursor.offset) {
                    return { ...prev, discographyLoadingMore: false };
                }

                return {
                    ...prev,
                    discography: appendDiscographyPage(prev.discography, page),
                    discographyOffset: page.nextOffset,
                    discographyHasMore: page.hasMore,
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
    }, [discographyIncludeAppearances, discographyTrackCount, market]);

    return {
        data,
        loading,
        loadMoreDiscography,
        loadMoreEpisodes,
    };
}
