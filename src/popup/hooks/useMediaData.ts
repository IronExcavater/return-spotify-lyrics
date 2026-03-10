import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import type {
    Album,
    Artist,
    Market,
    MaxInt,
    Show,
    SimplifiedAlbum,
    SimplifiedEpisode,
    SimplifiedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../shared/async';
import { formatIsoDate } from '../../shared/date';
import {
    createLogger,
    createOptionalRequestLogger,
    logError,
} from '../../shared/logging';
import {
    albumTrackToItem,
    artistToItem,
    showEpisodeToItem,
    showToItem,
    trackToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem } from '../../shared/types';
import type { DiscographyEntry } from '../components/DiscographyShelf';
import {
    buildEpisodeLookup,
    buildTrackLookup,
    sumDurationMs,
} from '../utils/mediaLookup';
import {
    buildGenreRecommendationQuery,
    buildShowRecommendationQuery,
    buildTrackRecommendationQuery,
    searchItems,
} from '../utils/mediaSearch';
import type { MediaRouteState } from './useMediaRoute';

const logger = createLogger('media');
const SHOW_EPISODE_PAGE_SIZE = 30;

const suppressNotFound = (error: Error) => /\b404\b/.test(error.message);
const logOptionalError = createOptionalRequestLogger(logger);
const logOptionalNotFound = createOptionalRequestLogger(
    logger,
    'optional request failed',
    suppressNotFound
);

export type MediaDataState =
    | {
          kind: 'album';
          album: Album;
          tracks: MediaItem[];
          trackLookup: Record<string, SimplifiedTrack>;
          totalDurationMs: number;
          selectedId?: string;
          selectedTrack?: SimplifiedTrack | null;
          artistTopTracks: MediaItem[];
          relatedArtists: MediaItem[];
          recommended: MediaItem[];
          popularLoading: boolean;
          relatedArtistsLoading: boolean;
          recommendedLoading: boolean;
      }
    | {
          kind: 'show';
          show: Show;
          episodes: MediaItem[];
          episodeLookup: Record<string, SimplifiedEpisode>;
          totalDurationMs: number;
          selectedId?: string;
          selectedEpisode?: SimplifiedEpisode | null;
          releaseYear?: string;
          episodesOffset: number;
          episodesHasMore: boolean;
          episodesLoadingMore: boolean;
          recommended: MediaItem[];
          recommendedLoading: boolean;
      }
    | {
          kind: 'artist';
          artist: Artist;
          topTracks: MediaItem[];
          discography: DiscographyEntry[];
          relatedArtists: MediaItem[];
          recommended: MediaItem[];
          relatedArtistsLoading: boolean;
          recommendedLoading: boolean;
      };

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

type SetMediaData = Dispatch<SetStateAction<MediaDataState | null>>;
type IsStale = () => boolean;
type TrackOrEpisodeRouteState = MediaRouteState & {
    kind: 'track' | 'episode';
};
type MediaContextRouteState = MediaRouteState & {
    kind: 'album' | 'show' | 'artist';
};
type MediaDataKind = MediaDataState['kind'];
type MediaDataByKind<K extends MediaDataKind> = Extract<
    MediaDataState,
    { kind: K }
>;
type MediaDataLoadContext = {
    market: Market;
    locale: string;
    discographyTrackCount: number;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
};

export const resolveMediaDataId = (value: string) => {
    if (value.startsWith('spotify:')) {
        const parts = value.split(':');
        const parsed = parts[2];
        if (parsed) return parsed;
    }

    try {
        const url = new URL(value);
        const match = url.pathname.match(/\/(track|episode)\/([^/]+)/);
        if (match?.[2]) return match[2];
    } catch {
        // Keep original string if it is not a URL.
    }

    return value;
};

const setIfFresh = (
    isStale: IsStale,
    setData: SetMediaData,
    updater: SetStateAction<MediaDataState | null>
) => {
    if (isStale()) return;
    setData(updater);
};

const patchByKind = <K extends MediaDataKind>(
    isStale: IsStale,
    setData: SetMediaData,
    kind: K,
    patch: (prev: MediaDataByKind<K>) => MediaDataByKind<K>
) => {
    setIfFresh(isStale, setData, (prev) => {
        if (!prev || prev.kind !== kind) return prev;
        return patch(prev as MediaDataByKind<K>);
    });
};

const buildDiscographyEntries = async (
    albums: Array<SimplifiedAlbum | Album>,
    market: Market,
    trackCount: number
): Promise<DiscographyEntry[]> => {
    const limit = Math.min(trackCount, 10) as MaxInt<50>;
    const entries = await Promise.all(
        albums.map(async (album) => {
            if (!album.id) return null;

            const tracksPage = await safeRequest(
                () =>
                    sendSpotifyMessage('getAlbumTracks', {
                        id: album.id,
                        market,
                        limit,
                    }),
                null,
                logOptionalError
            );
            if (!tracksPage) return null;

            const albumWithGroup =
                'album_group' in album
                    ? album
                    : { ...album, album_group: album.album_type };

            return {
                album: albumWithGroup as SimplifiedAlbum,
                tracks: tracksPage.items,
            };
        })
    );

    return entries.filter(Boolean) as DiscographyEntry[];
};

const rankRelatedArtists = (
    artists: Artist[],
    seedGenres?: string[]
): Artist[] => {
    if (artists.length === 0) return [];

    const seedSet = new Set(
        (seedGenres ?? []).map((genre) => genre.toLowerCase())
    );

    const scored = artists.map((artist) => {
        const artistGenres = artist.genres ?? [];
        const overlap = artistGenres.reduce(
            (count, genre) =>
                seedSet.has(genre.toLowerCase()) ? count + 1 : count,
            0
        );

        return {
            artist,
            overlap,
            popularity: artist.popularity ?? 0,
        };
    });

    const sorted = scored.sort(
        (a, b) => b.overlap - a.overlap || b.popularity - a.popularity
    );
    const filtered =
        seedSet.size > 0 ? sorted.filter((item) => item.overlap > 0) : sorted;

    return (filtered.length > 0 ? filtered : sorted).map((item) => item.artist);
};

const loadAlbumData = async ({
    id,
    selectedId,
    market,
    setData,
    isStale,
    logSearchError,
}: {
    id: string;
    selectedId?: string;
    market: Market;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) => {
    const [album, tracksPage] = await Promise.all([
        sendSpotifyMessage('getAlbum', { id, market }),
        sendSpotifyMessage('getAlbumTracks', {
            id,
            market,
            limit: 50,
        }),
    ]);
    if (isStale()) return;

    const tracks = tracksPage.items.map((track) =>
        albumTrackToItem(track, album)
    );
    const trackLookup = buildTrackLookup(tracksPage.items);
    const selectedTrack = selectedId ? (trackLookup[selectedId] ?? null) : null;
    const mainArtistId =
        selectedTrack?.artists?.[0]?.id ?? album.artists?.[0]?.id;
    const mainArtistName =
        selectedTrack?.artists?.[0]?.name ?? album.artists?.[0]?.name;

    setIfFresh(isStale, setData, {
        kind: 'album',
        album,
        tracks,
        trackLookup,
        totalDurationMs: sumDurationMs(tracksPage.items),
        selectedId,
        selectedTrack,
        artistTopTracks: [],
        relatedArtists: [],
        recommended: [],
        popularLoading: Boolean(mainArtistId),
        relatedArtistsLoading: false,
        recommendedLoading: Boolean(mainArtistName),
    });

    if (mainArtistId) {
        void (async () => {
            const topTracks = await safeRequest(
                () =>
                    sendSpotifyMessage('getArtistTopTracks', {
                        id: mainArtistId,
                        market,
                    }),
                { tracks: [] },
                logOptionalError
            );

            patchByKind(isStale, setData, 'album', (prev) => ({
                ...prev,
                artistTopTracks: topTracks.tracks.map(trackToItem),
                popularLoading: false,
            }));
        })();
    }

    if (mainArtistName) {
        void (async () => {
            const trackIds = new Set(
                tracksPage.items.map((track) => track.id).filter(Boolean)
            );
            const query = buildTrackRecommendationQuery({
                artistName: mainArtistName,
                trackName: selectedTrack?.name,
                albumName: album.name,
            });

            const recommended = await searchItems(
                query,
                ['track'],
                (results) =>
                    (results.tracks?.items ?? [])
                        .filter(
                            (item): item is Track =>
                                typeof item === 'object' && item !== null
                        )
                        .filter((item) => item.id && !trackIds.has(item.id))
                        .map(trackToItem),
                logSearchError
            );

            patchByKind(isStale, setData, 'album', (prev) => ({
                ...prev,
                recommended,
                recommendedLoading: false,
            }));
        })();
    }
};

const loadShowData = async ({
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
}) => {
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

    void (async () => {
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
    })();
};

const loadArtistData = async ({
    id,
    market,
    discographyTrackCount,
    setData,
    isStale,
    logSearchError,
}: {
    id: string;
    market: Market;
    discographyTrackCount: number;
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) => {
    const [artist, topTracks, relatedArtists] = await Promise.all([
        sendSpotifyMessage('getArtist', { id }),
        sendSpotifyMessage('getArtistTopTracks', { id, market }),
        safeRequest(
            () => sendSpotifyMessage('getArtistRelatedArtists', { id }),
            { artists: [] },
            logOptionalNotFound
        ),
    ]);
    if (isStale()) return;

    const fansAlsoLike = rankRelatedArtists(
        relatedArtists.artists.filter(
            (relatedArtist) => relatedArtist.id && relatedArtist.id !== id
        ),
        artist.genres
    )
        .slice(0, 12)
        .map(artistToItem);

    setIfFresh(isStale, setData, {
        kind: 'artist',
        artist,
        topTracks: topTracks.tracks.map(trackToItem),
        discography: [],
        relatedArtists: fansAlsoLike,
        recommended: [],
        relatedArtistsLoading: fansAlsoLike.length === 0,
        recommendedLoading: true,
    });

    void (async () => {
        const genreQuery = buildGenreRecommendationQuery(artist.genres);
        const genreCandidates = genreQuery
            ? await searchItems(
                  genreQuery,
                  ['artist'],
                  (results) =>
                      (results.artists?.items ?? [])
                          .filter(
                              (item): item is Artist =>
                                  typeof item === 'object' && item !== null
                          )
                          .filter((item) => item.id && item.id !== id),
                  logSearchError
              )
            : [];

        const shouldUseNameFallback =
            fansAlsoLike.length === 0 && genreCandidates.length === 0;

        const nameCandidates = shouldUseNameFallback
            ? await searchItems(
                  artist.name,
                  ['artist'],
                  (results) =>
                      (results.artists?.items ?? [])
                          .filter(
                              (item): item is Artist =>
                                  typeof item === 'object' && item !== null
                          )
                          .filter((item) => item.id && item.id !== id)
                          .filter((item) => (item.popularity ?? 0) >= 20),
                  logSearchError
              )
            : [];

        const merged = Array.from(
            new Map(
                [
                    ...relatedArtists.artists,
                    ...genreCandidates,
                    ...nameCandidates,
                ]
                    .filter((item) => item.id && item.id !== id)
                    .map((item) => [item.id!, item])
            ).values()
        );

        const ranked = rankRelatedArtists(merged, artist.genres)
            .slice(0, 12)
            .map(artistToItem);

        patchByKind(isStale, setData, 'artist', (prev) => ({
            ...prev,
            relatedArtists: ranked.length > 0 ? ranked : prev.relatedArtists,
            relatedArtistsLoading: false,
        }));
    })();

    void (async () => {
        const albumsPage = await safeRequest(
            () =>
                sendSpotifyMessage('getArtistAlbums', {
                    id,
                    market,
                    limit: 20,
                }),
            null,
            logOptionalError
        );

        const discographySeed =
            albumsPage?.items?.filter((item) => item.id) ?? [];
        if (!discographySeed.length) return;

        const discographyAlbums = Array.from(
            new Map(discographySeed.map((item) => [item.id!, item])).values()
        ).slice(0, 10);

        const discography = await buildDiscographyEntries(
            discographyAlbums,
            market,
            discographyTrackCount
        );

        patchByKind(isStale, setData, 'artist', (prev) => ({
            ...prev,
            discography,
        }));
    })();

    void (async () => {
        const query = buildTrackRecommendationQuery({
            artistName: artist.name,
        });
        const topTrackIds = new Set(
            topTracks.tracks.map((track) => track.id).filter(Boolean)
        );

        const recommended = await searchItems(
            query,
            ['track'],
            (results) =>
                (results.tracks?.items ?? [])
                    .filter(
                        (item): item is Track =>
                            typeof item === 'object' && item !== null
                    )
                    .filter((item) => item.id && !topTrackIds.has(item.id))
                    .map(trackToItem),
            logSearchError
        );

        patchByKind(isStale, setData, 'artist', (prev) => ({
            ...prev,
            recommended,
            recommendedLoading: false,
        }));
    })();
};

const loadRouteWithMediaContextData = async (
    routeState: MediaContextRouteState,
    context: MediaDataLoadContext
) => {
    const {
        market,
        locale,
        discographyTrackCount,
        setData,
        isStale,
        logSearchError,
    } = context;

    switch (routeState.kind) {
        case 'album':
            await loadAlbumData({
                id: routeState.id,
                selectedId: routeState.selectedId,
                market,
                setData,
                isStale,
                logSearchError,
            });
            return;
        case 'show':
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
        case 'artist':
            await loadArtistData({
                id: routeState.id,
                market,
                discographyTrackCount,
                setData,
                isStale,
                logSearchError,
            });
            return;
        default:
            setIfFresh(isStale, setData, null);
    }
};

const resolveFromLoadedMediaData = (
    data: MediaDataState | null,
    state: TrackOrEpisodeRouteState,
    goTo: GoToMedia
) => {
    if (state.kind === 'track' && data?.kind === 'album') {
        const resolvedId = resolveMediaDataId(state.id);
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
        const resolvedId = resolveMediaDataId(state.id);
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

const resolveMediaContextFromApi = async ({
    state,
    market,
    goTo,
}: {
    state: TrackOrEpisodeRouteState;
    market: Market;
    goTo: GoToMedia;
}) => {
    if (state.kind === 'track') {
        const id = resolveMediaDataId(state.id);
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

    const id = resolveMediaDataId(state.id);
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

const isTrackOrEpisodeRoute = (
    routeState: UseMediaDataOptions['state']
): routeState is TrackOrEpisodeRouteState =>
    Boolean(
        routeState &&
            (routeState.kind === 'track' || routeState.kind === 'episode')
    );

const isMediaContextRoute = (
    routeState: UseMediaDataOptions['state']
): routeState is MediaContextRouteState =>
    Boolean(
        routeState &&
            (routeState.kind === 'album' ||
                routeState.kind === 'show' ||
                routeState.kind === 'artist')
    );

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

    // Resolve /media routes opened with track/episode ids into their parent media context.
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

    // Load album/show/artist data.
    useEffect(() => {
        if (!state?.id || !state?.kind) {
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
                await loadRouteWithMediaContextData(state, {
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

    return {
        data,
        loading,
        loadMoreEpisodes,
    };
}
