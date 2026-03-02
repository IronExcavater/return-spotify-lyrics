import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Flex, Text, Tooltip } from '@radix-ui/themes';
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
import { useLocation } from 'react-router-dom';

import { safeRequest } from '../../shared/async';
import {
    formatDurationLong,
    formatDurationShort,
    formatIsoDate,
} from '../../shared/date';
import { resolveLocale, resolveMarket } from '../../shared/locale';
import {
    createLogger,
    createOptionalRequestLogger,
    logError,
} from '../../shared/logging';
import {
    albumToItem,
    albumTrackToItem,
    artistToItem,
    formatAlbumType,
    showEpisodeToItem,
    showToItem,
    trackToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import { MediaItem } from '../../shared/types.ts';
import {
    type DiscographyEntry,
    DiscographyShelf,
} from '../components/DiscographyShelf';
import { type HeroData, MediaHero } from '../components/MediaHero';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import { TextButton } from '../components/TextButton';
import { useHistory } from '../hooks/useHistory';
import { buildMediaActions } from '../hooks/useMediaActions';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { mediaRouteStore, useRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';
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

const logger = createLogger('media');
const SHOW_EPISODE_PAGE_SIZE = 30;

const suppressNotFound = (err: Error) => /\b404\b/.test(err.message);
const logOptionalError = createOptionalRequestLogger(logger);
const logOptionalNotFound = createOptionalRequestLogger(
    logger,
    'optional request failed',
    suppressNotFound
);

const CONTEXT_KIND_LABEL: Partial<Record<MediaItem['parentKind'], string>> = {
    album: 'album',
    playlist: 'playlist',
    show: 'show',
    audiobook: 'audiobook',
};

type MediaViewState =
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

type HeroRoutes = {
    goToArtist: (id: string) => void;
    goToShow: (id: string) => void;
};

const buildReleaseInfo = (album: Album, locale: string) => {
    const albumType = formatAlbumType(album);
    const year = formatIsoDate(album.release_date, { year: 'numeric' }, locale);
    const fullDate = formatIsoDate(
        album.release_date,
        { dateStyle: 'long' },
        locale
    );
    if (!albumType && !year) return undefined;
    return (
        <>
            {albumType && <span>{albumType}</span>}
            {albumType && year && <span> • </span>}
            {year &&
                (fullDate ? (
                    <Tooltip content={fullDate}>
                        <span>{year}</span>
                    </Tooltip>
                ) : (
                    <span>{year}</span>
                ))}
        </>
    );
};

const renderArtistNames = (
    artists: Array<{ id?: string | null; name: string }>,
    routes: HeroRoutes
) => (
    <span className="min-w-0">
        {artists.map((artist, index) => {
            const onClick = artist.id
                ? () => routes.goToArtist(artist.id!)
                : undefined;
            return (
                <Fragment key={artist.id ?? artist.name}>
                    <TextButton
                        onClick={onClick}
                        interactive={Boolean(onClick)}
                        size="2"
                        weight="medium"
                        color="gray"
                    >
                        {artist.name}
                    </TextButton>
                    {index < artists.length - 1 && (
                        <Text as="span" size="2" color="gray">
                            {',\u00A0'}
                        </Text>
                    )}
                </Fragment>
            );
        })}
    </span>
);

const buildMediaHeroData = (
    data: MediaViewState | null,
    options: {
        locale: string;
        settingsLocale: string;
        routes: HeroRoutes;
        selectedTrack?: SimplifiedTrack | null;
        selectedEpisode?: SimplifiedEpisode | null;
    }
): HeroData | null => {
    if (!data) return null;
    if (data.kind === 'album') {
        const selectedTrack =
            options.selectedTrack !== undefined
                ? options.selectedTrack
                : data.selectedTrack;
        if (selectedTrack) {
            return {
                title: selectedTrack.name,
                subtitle: renderArtistNames(
                    selectedTrack.artists,
                    options.routes
                ),
                info: buildReleaseInfo(data.album, options.settingsLocale),
                imageUrl: data.album.images?.[0]?.url,
                heroUrl: data.album.images?.[0]?.url,
                duration: formatDurationShort(selectedTrack.duration_ms),
                item: albumTrackToItem(selectedTrack, data.album),
            };
        }
        return {
            title: data.album.name,
            subtitle: renderArtistNames(data.album.artists, options.routes),
            info: buildReleaseInfo(data.album, options.settingsLocale),
            imageUrl: data.album.images?.[0]?.url,
            heroUrl: data.album.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: albumToItem(data.album),
        };
    }
    if (data.kind === 'show') {
        const selectedEpisode =
            options.selectedEpisode !== undefined
                ? options.selectedEpisode
                : data.selectedEpisode;
        if (selectedEpisode) {
            return {
                title: selectedEpisode.name,
                subtitle: data.show.id ? (
                    <TextButton
                        onClick={() => options.routes.goToShow(data.show.id)}
                    >
                        {data.show.name}
                    </TextButton>
                ) : (
                    data.show.name
                ),
                info: data.show.publisher,
                imageUrl: data.show.images?.[0]?.url,
                heroUrl: data.show.images?.[0]?.url,
                duration: formatDurationShort(selectedEpisode.duration_ms),
                item: showEpisodeToItem(
                    selectedEpisode,
                    data.show,
                    options.settingsLocale
                ),
            };
        }
        return {
            title: data.show.name,
            subtitle: `${data.show.total_episodes} episodes`,
            info: data.show.publisher,
            imageUrl: data.show.images?.[0]?.url,
            heroUrl: data.show.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: showToItem(data.show),
        };
    }
    if (data.kind === 'artist') {
        const followerTotal = data.artist.followers?.total;
        const genres =
            data.artist.genres?.map((genre) =>
                genre.replace(/\b\w/g, (char) => char.toUpperCase())
            ) ?? [];
        return {
            title: data.artist.name,
            subtitle:
                followerTotal != null
                    ? `${followerTotal.toLocaleString(options.locale)} followers`
                    : undefined,
            info: genres.slice(0, 3).join(' • '),
            imageUrl: data.artist.images?.[0]?.url,
            heroUrl: data.artist.images?.[0]?.url,
            item: artistToItem(data.artist),
        };
    }
    return null;
};

export function MediaView() {
    const location = useLocation();
    const { settings } = useSettings();
    const { goTo } = useHistory();
    const routeHistory = useMemo(() => ({ goTo }), [goTo]);
    const market = resolveMarket(settings.locale);
    const locale = resolveLocale(settings.locale);

    const locationState = location.state as MediaRouteState | null;
    const { state, restoring } = useRouteState<MediaRouteState>({
        locationState,
        store: mediaRouteStore,
        routeHistory,
        routePath: '/media',
    });

    const [data, setData] = useState<MediaViewState | null>(null);
    const [loading, setLoading] = useState(true);
    const dataRef = useRef<MediaViewState | null>(null);
    const loadRequestIdRef = useRef(0);
    const [discographySort, setDiscographySort] = useState<'newest' | 'oldest'>(
        'newest'
    );
    const discographyTrackCount = 5;
    const skeletonLabel = '\u00A0';
    const skeletonRows = useMemo(
        () =>
            Array.from({ length: 6 }, (_, index) => ({
                id: `skeleton-${index}`,
                title: skeletonLabel,
                subtitle: skeletonLabel,
            })),
        [skeletonLabel]
    );
    const logSearchError = useCallback((error: unknown) => {
        logError(logger, 'search failed', error);
    }, []);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        if (!state?.id || !state?.kind) return;
        if (state.kind !== 'track' && state.kind !== 'episode') return;

        let cancelled = false;
        const resolveId = (value: string) => {
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
                /* empty */
            }
            return value;
        };

        const resolveFromCurrent = () => {
            if (state.kind === 'track' && data?.kind === 'album') {
                const resolvedId = resolveId(state.id);
                const track =
                    data.trackLookup[resolvedId] ??
                    data.trackLookup[state.id] ??
                    null;
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
                const resolvedId = resolveId(state.id);
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

        if (resolveFromCurrent()) return;
        const resolve = async () => {
            try {
                if (state.kind === 'track') {
                    const id = resolveId(state.id);
                    const track = await sendSpotifyMessage('getTrack', {
                        id,
                    });
                    if (cancelled) return;
                    if (track.album?.id) {
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
                } else {
                    const id = resolveId(state.id);
                    const episode = await sendSpotifyMessage('getEpisode', {
                        id,
                        market,
                    });
                    if (cancelled) return;
                    if (episode.show?.id) {
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
                }
            } catch (error) {
                logError(logger, 'Failed to resolve context', error);
            }
        };

        void resolve();
        return () => {
            cancelled = true;
        };
    }, [data, goTo, market, state?.id, state?.kind]);

    useEffect(() => {
        if (!state?.id || !state?.kind) {
            setData(null);
            setLoading(false);
            return;
        }
        if (state.kind === 'track' || state.kind === 'episode') {
            if (!dataRef.current) {
                setData(null);
                setLoading(true);
            }
            return;
        }

        let cancelled = false;
        const requestId = loadRequestIdRef.current + 1;
        loadRequestIdRef.current = requestId;
        const isStale = () =>
            cancelled || loadRequestIdRef.current !== requestId;

        const load = async () => {
            setData(null);
            setLoading(true);
            try {
                switch (state.kind) {
                    case 'album': {
                        const [album, tracksPage] = await Promise.all([
                            sendSpotifyMessage('getAlbum', {
                                id: state.id,
                                market,
                            }),
                            sendSpotifyMessage('getAlbumTracks', {
                                id: state.id,
                                market,
                                limit: 50,
                            }),
                        ]);
                        if (isStale()) break;
                        const totalDurationMs = sumDurationMs(tracksPage.items);
                        const tracks = tracksPage.items.map((track) =>
                            albumTrackToItem(track, album)
                        );
                        const trackLookup = buildTrackLookup(tracksPage.items);
                        const selectedTrack =
                            state.selectedId != null
                                ? (trackLookup[state.selectedId] ?? null)
                                : null;
                        const mainArtistId =
                            selectedTrack?.artists?.[0]?.id ??
                            album.artists?.[0]?.id;
                        const mainArtistName =
                            selectedTrack?.artists?.[0]?.name ??
                            album.artists?.[0]?.name;
                        if (!isStale()) {
                            setData({
                                kind: 'album',
                                album,
                                tracks,
                                trackLookup,
                                totalDurationMs,
                                selectedId: state.selectedId,
                                selectedTrack,
                                artistTopTracks: [],
                                relatedArtists: [],
                                recommended: [],
                                popularLoading: Boolean(mainArtistId),
                                relatedArtistsLoading: false,
                                recommendedLoading: Boolean(mainArtistName),
                            });
                        }
                        if (mainArtistId && !isStale()) {
                            void (async () => {
                                if (isStale()) return;
                                const topTracks = await safeRequest(
                                    () =>
                                        sendSpotifyMessage(
                                            'getArtistTopTracks',
                                            {
                                                id: mainArtistId,
                                                market,
                                            }
                                        ),
                                    { tracks: [] },
                                    logOptionalError
                                );
                                if (!isStale()) {
                                    setData((prev) =>
                                        prev?.kind === 'album'
                                            ? {
                                                  ...prev,
                                                  artistTopTracks:
                                                      topTracks.tracks.map(
                                                          trackToItem
                                                      ),
                                                  popularLoading: false,
                                              }
                                            : prev
                                    );
                                }
                            })();
                        }
                        if (!isStale()) {
                            void (async () => {
                                if (isStale()) return;
                                const seedArtist = mainArtistName;
                                const trackIds = new Set(
                                    tracksPage.items
                                        .map((track) => track.id)
                                        .filter(Boolean)
                                );
                                const query = buildTrackRecommendationQuery({
                                    artistName: seedArtist,
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
                                                    typeof item === 'object' &&
                                                    item !== null
                                            )
                                            .filter(
                                                (item) =>
                                                    item.id &&
                                                    !trackIds.has(item.id)
                                            )
                                            .map(trackToItem),
                                    logSearchError
                                );
                                if (!isStale()) {
                                    setData((prev) =>
                                        prev?.kind === 'album'
                                            ? {
                                                  ...prev,
                                                  recommended,
                                                  recommendedLoading: false,
                                              }
                                            : prev
                                    );
                                }
                            })();
                        }
                        break;
                    }
                    case 'show': {
                        const [show, episodesPage] = await Promise.all([
                            sendSpotifyMessage('getShow', {
                                id: state.id,
                                market,
                            }),
                            sendSpotifyMessage('getShowEpisodes', {
                                id: state.id,
                                market,
                                limit: SHOW_EPISODE_PAGE_SIZE,
                            }),
                        ]);
                        if (isStale()) break;
                        const totalDurationMs = sumDurationMs(
                            episodesPage.items
                        );
                        const episodes = episodesPage.items.map((episode) =>
                            showEpisodeToItem(episode, show, settings.locale)
                        );
                        const releaseYear = formatIsoDate(
                            episodesPage.items[0]?.release_date,
                            { year: 'numeric' },
                            settings.locale
                        );
                        const episodeLookup = buildEpisodeLookup(
                            episodesPage.items
                        );
                        const selectedEpisode =
                            state.selectedId != null
                                ? (episodeLookup[state.selectedId] ?? null)
                                : null;
                        const nextOffset = episodesPage.items.length;
                        const hasMore =
                            nextOffset < (episodesPage.total ?? nextOffset);
                        if (!isStale()) {
                            setData({
                                kind: 'show',
                                show,
                                episodes,
                                episodeLookup,
                                totalDurationMs,
                                selectedId: state.selectedId,
                                selectedEpisode,
                                releaseYear,
                                episodesOffset: nextOffset,
                                episodesHasMore: hasMore,
                                episodesLoadingMore: false,
                                recommended: [],
                                recommendedLoading: true,
                            });
                        }
                        if (!isStale()) {
                            void (async () => {
                                if (isStale()) return;
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
                                                    typeof item === 'object' &&
                                                    item !== null
                                            )
                                            .filter(
                                                (item) =>
                                                    item.id &&
                                                    item.id !== show.id
                                            )
                                            .map(showToItem),
                                    logSearchError
                                );
                                if (!isStale()) {
                                    setData((prev) =>
                                        prev?.kind === 'show'
                                            ? {
                                                  ...prev,
                                                  recommended,
                                                  recommendedLoading: false,
                                              }
                                            : prev
                                    );
                                }
                            })();
                        }
                        break;
                    }
                    case 'artist': {
                        const [artist, topTracks, relatedArtists] =
                            await Promise.all([
                                sendSpotifyMessage('getArtist', {
                                    id: state.id,
                                }),
                                sendSpotifyMessage('getArtistTopTracks', {
                                    id: state.id,
                                    market,
                                }),
                                safeRequest(
                                    () =>
                                        sendSpotifyMessage(
                                            'getArtistRelatedArtists',
                                            { id: state.id }
                                        ),
                                    { artists: [] },
                                    logOptionalNotFound
                                ),
                            ]);
                        if (isStale()) break;
                        const fansAlsoLike = rankRelatedArtists(
                            relatedArtists.artists.filter(
                                (artist) => artist.id && artist.id !== state.id
                            ),
                            artist.genres
                        )
                            .slice(0, 12)
                            .map(artistToItem);
                        const initialRelatedLoading = fansAlsoLike.length === 0;
                        if (!isStale()) {
                            setData({
                                kind: 'artist',
                                artist,
                                topTracks: topTracks.tracks.map(trackToItem),
                                discography: [],
                                relatedArtists: fansAlsoLike,
                                recommended: [],
                                relatedArtistsLoading: initialRelatedLoading,
                                recommendedLoading: true,
                            });
                        }
                        if (!isStale()) {
                            void (async () => {
                                if (isStale()) return;
                                const genreQuery =
                                    buildGenreRecommendationQuery(
                                        artist.genres
                                    );
                                const genreCandidates = genreQuery
                                    ? await searchItems(
                                          genreQuery,
                                          ['artist'],
                                          (results) =>
                                              (results.artists?.items ?? [])
                                                  .filter(
                                                      (item): item is Artist =>
                                                          typeof item ===
                                                              'object' &&
                                                          item !== null
                                                  )
                                                  .filter(
                                                      (item) =>
                                                          item.id &&
                                                          item.id !== state.id
                                                  ),
                                          logSearchError
                                      )
                                    : [];
                                const shouldUseNameFallback =
                                    fansAlsoLike.length === 0 &&
                                    genreCandidates.length === 0;
                                const nameCandidates = shouldUseNameFallback
                                    ? await searchItems(
                                          artist.name,
                                          ['artist'],
                                          (results) =>
                                              (results.artists?.items ?? [])
                                                  .filter(
                                                      (item): item is Artist =>
                                                          typeof item ===
                                                              'object' &&
                                                          item !== null
                                                  )
                                                  .filter(
                                                      (item) =>
                                                          item.id &&
                                                          item.id !== state.id
                                                  )
                                                  .filter(
                                                      (item) =>
                                                          (item.popularity ??
                                                              0) >= 20
                                                  ),
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
                                            .filter(
                                                (item) =>
                                                    item.id &&
                                                    item.id !== state.id
                                            )
                                            .map((item) => [item.id!, item])
                                    ).values()
                                );
                                const ranked = rankRelatedArtists(
                                    merged,
                                    artist.genres
                                )
                                    .slice(0, 12)
                                    .map(artistToItem);
                                if (isStale()) return;
                                setData((prev) =>
                                    prev?.kind === 'artist'
                                        ? {
                                              ...prev,
                                              relatedArtists:
                                                  ranked.length > 0
                                                      ? ranked
                                                      : prev.relatedArtists,
                                              relatedArtistsLoading: false,
                                          }
                                        : prev
                                );
                            })();
                        }
                        if (!isStale()) {
                            void (async () => {
                                if (isStale()) return;
                                const albumsPage = await safeRequest(
                                    () =>
                                        sendSpotifyMessage('getArtistAlbums', {
                                            id: state.id,
                                            market,
                                            limit: 20,
                                        }),
                                    null,
                                    logOptionalError
                                );
                                const discographySeed =
                                    albumsPage?.items?.filter(
                                        (item) => item.id
                                    ) ?? [];
                                if (!discographySeed.length) return;
                                const discographyAlbums = Array.from(
                                    new Map(
                                        discographySeed.map((item) => [
                                            item.id!,
                                            item,
                                        ])
                                    ).values()
                                ).slice(0, 10);
                                const discography =
                                    await buildDiscographyEntries(
                                        discographyAlbums,
                                        market,
                                        discographyTrackCount
                                    );
                                if (!isStale()) {
                                    setData((prev) =>
                                        prev?.kind === 'artist'
                                            ? { ...prev, discography }
                                            : prev
                                    );
                                }
                            })();
                        }
                        if (!isStale()) {
                            void (async () => {
                                if (isStale()) return;
                                const query = buildTrackRecommendationQuery({
                                    artistName: artist.name,
                                });
                                const topTrackIds = new Set(
                                    topTracks.tracks
                                        .map((track) => track.id)
                                        .filter(Boolean)
                                );
                                const recommended = await searchItems(
                                    query,
                                    ['track'],
                                    (results) =>
                                        (results.tracks?.items ?? [])
                                            .filter(
                                                (item): item is Track =>
                                                    typeof item === 'object' &&
                                                    item !== null
                                            )
                                            .filter(
                                                (item) =>
                                                    item.id &&
                                                    !topTrackIds.has(item.id)
                                            )
                                            .map(trackToItem),
                                    logSearchError
                                );
                                if (!isStale()) {
                                    setData((prev) =>
                                        prev?.kind === 'artist'
                                            ? {
                                                  ...prev,
                                                  recommended,
                                                  recommendedLoading: false,
                                              }
                                            : prev
                                    );
                                }
                            })();
                        }
                        break;
                    }
                    default: {
                        setData(null);
                    }
                }
            } finally {
                if (!isStale()) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [market, settings.locale, state?.id, state?.kind]);

    const loadMoreEpisodes = useCallback(async () => {
        let offset: number | null = null;

        setData((prev) => {
            if (!prev || prev.kind !== 'show') return prev;
            if (prev.episodesLoadingMore || !prev.episodesHasMore) return prev;
            offset = prev.episodesOffset;
            return { ...prev, episodesLoadingMore: true };
        });

        if (offset === null) return;
        if (!state?.id) return;

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
                    showEpisodeToItem(episode, prev.show, settings.locale)
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
    }, [market, settings.locale, state?.id]);

    const resolveLookupId = useCallback((value?: string | null) => {
        if (!value) return undefined;
        if (value.startsWith('spotify:')) {
            const parts = value.split(':');
            if (parts[2]) return parts[2];
        }
        return value;
    }, []);

    const isResolvingRoute =
        state?.kind === 'track' || state?.kind === 'episode';
    const dataMatchesState = useMemo(() => {
        if (!data || !state?.id || !state?.kind || isResolvingRoute)
            return false;
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
    }, [data, isResolvingRoute, state?.id, state?.kind]);
    const viewData = dataMatchesState ? data : null;
    const resolvedSelectedId = useMemo(
        () => resolveLookupId(state?.selectedId),
        [resolveLookupId, state?.selectedId]
    );
    const selectedTrack = useMemo(() => {
        if (!viewData || viewData.kind !== 'album' || !resolvedSelectedId)
            return null;
        return (
            viewData.trackLookup[resolvedSelectedId] ??
            viewData.trackLookup[state?.selectedId ?? ''] ??
            null
        );
    }, [resolvedSelectedId, state?.selectedId, viewData]);
    const selectedEpisode = useMemo(() => {
        if (!viewData || viewData.kind !== 'show' || !resolvedSelectedId)
            return null;
        return (
            viewData.episodeLookup[resolvedSelectedId] ??
            viewData.episodeLookup[state?.selectedId ?? ''] ??
            null
        );
    }, [resolvedSelectedId, state?.selectedId, viewData]);
    const heroRoutes = useMemo(
        () => ({
            goToArtist: (id: string) => goTo('/media', { kind: 'artist', id }),
            goToShow: (id: string) => goTo('/media', { kind: 'show', id }),
        }),
        [goTo]
    );
    const hero = useMemo<HeroData | null>(
        () =>
            buildMediaHeroData(viewData, {
                locale,
                settingsLocale: settings.locale,
                selectedTrack,
                selectedEpisode,
                routes: heroRoutes,
            }),
        [
            heroRoutes,
            locale,
            selectedEpisode,
            selectedTrack,
            settings.locale,
            viewData,
        ]
    );

    const hasSelection = Boolean(state?.id && state?.kind);
    const isStaleSelection =
        hasSelection && !dataMatchesState && !isResolvingRoute;

    const activeKind =
        viewData?.kind ??
        (state?.kind === 'track'
            ? 'album'
            : state?.kind === 'episode'
              ? 'show'
              : state?.kind);
    const isLoadingView = loading || !viewData || isStaleSelection;
    const albumData = viewData?.kind === 'album' ? viewData : null;
    const showData = viewData?.kind === 'show' ? viewData : null;
    const artistData = viewData?.kind === 'artist' ? viewData : null;
    const shouldShowAlbumSection = isLoadingView
        ? !state?.singleTrack
        : (albumData?.tracks?.length ?? 0) > 1;

    const albumTracksSection = useMemo(() => {
        if (activeKind !== 'album' || !shouldShowAlbumSection) return null;
        return (
            <MediaSection
                editing={false}
                loading={isLoadingView}
                onTitleClick={
                    albumData?.album.id
                        ? () =>
                              goTo('/media', {
                                  kind: 'album',
                                  id: albumData.album.id,
                              })
                        : undefined
                }
                section={
                    {
                        id: 'album-tracks',
                        title: albumData?.album.name ?? 'Album',
                        view: 'list',
                        trackSubtitleMode: 'artists',
                        items: isLoadingView
                            ? skeletonRows
                            : (albumData?.tracks ?? []),
                    } satisfies MediaSectionState
                }
                onChange={() => undefined}
            />
        );
    }, [
        activeKind,
        albumData?.album.id,
        albumData?.album.name,
        albumData?.tracks,
        isLoadingView,
        goTo,
        shouldShowAlbumSection,
        skeletonRows,
    ]);

    const artistUris = useMemo(
        () =>
            artistData
                ? artistData.topTracks
                      .map((track) => track.uri)
                      .filter((uri): uri is string => Boolean(uri))
                : [],
        [artistData]
    );
    const buildPlaybackRequest = useCallback(() => {
        if (!hero?.item) return null;
        if (artistData) {
            return artistUris.length > 0 ? { uris: artistUris } : null;
        }
        if (albumData) {
            const contextUri = albumData.album.uri ?? hero.item.uri;
            if (!contextUri) return null;
            const selectedId = resolvedSelectedId ?? state?.selectedId;
            const selectedIndex =
                selectedId != null
                    ? albumData.tracks.findIndex(
                          (track) => (track.id ?? track.uri) === selectedId
                      )
                    : -1;
            return {
                contextUri,
                offset:
                    selectedIndex >= 0
                        ? { position: selectedIndex }
                        : undefined,
            };
        }
        if (showData) {
            const contextUri = showData?.show.uri ?? hero.item.uri;
            if (!contextUri) return null;
            const selectedId = resolvedSelectedId ?? state?.selectedId;
            const selectedIndex =
                selectedId != null
                    ? (showData?.episodes ?? []).findIndex(
                          (episode) =>
                              (episode.id ?? episode.uri) === selectedId
                      )
                    : -1;
            return {
                contextUri,
                offset:
                    selectedIndex >= 0
                        ? { position: selectedIndex }
                        : undefined,
            };
        }
        return hero.item.uri ? { uris: [hero.item.uri] } : null;
    }, [
        albumData,
        artistData,
        artistUris,
        hero?.item,
        resolvedSelectedId,
        showData,
        state?.selectedId,
    ]);
    const heroActions = useMemo(
        () => (hero ? buildMediaActions(hero.item) : null),
        [hero?.item]
    );
    const artistPlayAction = useMemo(
        () =>
            artistData && artistUris.length > 0
                ? {
                      id: 'play-popular',
                      label: 'Play popular',
                      shortcut: '↵',
                      onSelect: () => {
                          void sendSpotifyMessage('startPlayback', {
                              uris: artistUris,
                          });
                      },
                  }
                : null,
        [artistData, artistUris]
    );
    const playContextAction = useMemo(() => {
        if (!hero?.item) return null;
        if (hero.item.kind !== 'track' && hero.item.kind !== 'episode') {
            return null;
        }
        const request = buildPlaybackRequest();
        if (!request || !('contextUri' in request) || !request.contextUri) {
            return null;
        }
        const contextLabel =
            CONTEXT_KIND_LABEL[hero.item.parentKind] ?? 'context';
        return {
            id: 'play-context',
            label: `Play from ${contextLabel}`,
            onSelect: () => {
                void sendSpotifyMessage('startPlayback', request);
            },
        };
    }, [
        buildPlaybackRequest,
        hero?.item,
        hero?.item?.kind,
        hero?.item?.parentKind,
    ]);
    const mergedHeroActions = useMemo(() => {
        if (!heroActions) return null;
        const primary = [...heroActions.primary];
        const secondary = [...heroActions.secondary];
        if (playContextAction) {
            const playNowIndex = primary.findIndex(
                (action) => action.id === 'play-now'
            );
            if (playNowIndex >= 0) {
                primary.splice(playNowIndex + 1, 0, playContextAction);
            } else {
                primary.unshift(playContextAction);
            }
        }
        if (artistPlayAction) primary.unshift(artistPlayAction);
        return { primary, secondary };
    }, [artistPlayAction, heroActions, playContextAction]);
    const playNowAction = useMemo(
        () => heroActions?.primary.find((action) => action.id === 'play-now'),
        [heroActions]
    );
    const canTogglePlayback = useMemo(
        () => (artistData ? artistUris.length > 0 : Boolean(hero?.item?.uri)),
        [artistData, artistUris.length, hero?.item?.uri]
    );

    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    const handlePlay = useCallback(() => {
        if (playNowAction) {
            playNowAction.onSelect();
            return;
        }
        const request = buildPlaybackRequest();
        if (!request) return;
        void sendSpotifyMessage('startPlayback', request);
    }, [buildPlaybackRequest, playNowAction]);

    const popularAlbumTracks = useMemo(
        () =>
            albumData
                ? (albumData.artistTopTracks ?? [])
                      .filter(
                          (track) =>
                              track.id !== selectedTrack?.id &&
                              !albumData.trackLookup?.[track.id ?? '']
                      )
                      .slice(0, 12)
                : [],
        [albumData, selectedTrack?.id]
    );
    const albumPopularLoading =
        isLoadingView ||
        (viewData?.kind === 'album' && viewData.popularLoading);
    const albumRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'album' && viewData.recommendedLoading);
    const showRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'show' && viewData.recommendedLoading);
    const artistRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'artist' && viewData.recommendedLoading);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    if (!state) {
        if (restoring) {
            return (
                <Flex p="3" direction="column" gap="2">
                    <SkeletonText
                        loading
                        parts={[skeletonLabel]}
                        preset="media-row"
                        variant="title"
                    >
                        <Text size="5" weight="bold">
                            {skeletonLabel}
                        </Text>
                    </SkeletonText>
                    <SkeletonText
                        loading
                        parts={[skeletonLabel]}
                        preset="media-row"
                        variant="subtitle"
                    >
                        <Text size="2" color="gray">
                            {skeletonLabel}
                        </Text>
                    </SkeletonText>
                </Flex>
            );
        }
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    Select a media item to view details.
                </Text>
            </Flex>
        );
    }

    if (!loading && !viewData && !isResolvingRoute && !isStaleSelection) {
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    This media type is not supported yet.
                </Text>
            </Flex>
        );
    }

    return (
        <StickyLayout.Root
            className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 flex-col overflow-y-auto"
            scrollRef={scrollRef}
        >
            <StickyLayout.Sticky order={0} className="z-30" heightOffset={8}>
                <MediaHero
                    hero={hero}
                    loading={isLoadingView}
                    heroUrl={hero?.heroUrl}
                    scrollRef={scrollRef}
                    collapseKey={viewKey}
                    mergedHeroActions={mergedHeroActions}
                    canTogglePlayback={canTogglePlayback}
                    sticky={false}
                    onPlay={handlePlay}
                />
            </StickyLayout.Sticky>

            <StickyLayout.Body>
                <Flex pl="3" direction="column">
                    {activeKind === 'album' && (
                        <>
                            {albumTracksSection}
                            {(albumPopularLoading ||
                                popularAlbumTracks.length > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={albumPopularLoading}
                                    section={
                                        {
                                            id: 'album-recommended',
                                            title: 'Popular',
                                            view: 'list',
                                            trackSubtitleMode: 'artist-album',
                                            items: albumPopularLoading
                                                ? skeletonRows
                                                : popularAlbumTracks,
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                />
                            )}
                            {(albumRecommendedLoading ||
                                (albumData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={albumRecommendedLoading}
                                    section={
                                        {
                                            id: 'album-recommended-albums',
                                            title: 'Recommended',
                                            view: 'list',
                                            infinite: 'rows',
                                            rows: 0,
                                            trackSubtitleMode: 'artist-album',
                                            items: albumRecommendedLoading
                                                ? skeletonRows
                                                : (albumData?.recommended ??
                                                  []),
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                />
                            )}
                        </>
                    )}

                    {activeKind === 'show' && (
                        <>
                            <MediaSection
                                editing={false}
                                loading={isLoadingView}
                                section={
                                    {
                                        id: 'show-episodes',
                                        title: showData?.show.name ?? 'Show',
                                        subtitle: [
                                            'Show',
                                            showData?.releaseYear,
                                        ]
                                            .filter(Boolean)
                                            .join(' • '),
                                        view: 'list',
                                        infinite: 'rows',
                                        rows: 0,
                                        items: isLoadingView
                                            ? skeletonRows
                                            : (showData?.episodes ?? []),
                                        hasMore: isLoadingView
                                            ? false
                                            : showData?.episodesHasMore,
                                        loadingMore: isLoadingView
                                            ? false
                                            : showData?.episodesLoadingMore,
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                                onLoadMore={loadMoreEpisodes}
                            />
                            {(showRecommendedLoading ||
                                (showData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={showRecommendedLoading}
                                    section={
                                        {
                                            id: 'show-recommended',
                                            title: 'Recommended',
                                            view: 'list',
                                            infinite: 'rows',
                                            rows: 0,
                                            items: showRecommendedLoading
                                                ? skeletonRows
                                                : (showData?.recommended ?? []),
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                />
                            )}
                        </>
                    )}

                    {activeKind === 'artist' && (
                        <>
                            {(isLoadingView ||
                                (artistData?.topTracks?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={isLoadingView}
                                    section={
                                        {
                                            id: 'artist-popular',
                                            title: 'Popular',
                                            view: 'list',
                                            trackSubtitleMode: 'artist-album',
                                            items: isLoadingView
                                                ? skeletonRows
                                                : (artistData?.topTracks ?? []),
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                />
                            )}
                            <MediaSection
                                editing={false}
                                loading={Boolean(
                                    isLoadingView ||
                                        artistData?.relatedArtistsLoading
                                )}
                                section={
                                    {
                                        id: 'artist-fans-also-like',
                                        title: 'Related artists',
                                        view: 'card',
                                        cardSize: 3,
                                        rows: 1,
                                        items:
                                            isLoadingView ||
                                            artistData?.relatedArtistsLoading
                                                ? skeletonRows
                                                : (artistData?.relatedArtists ??
                                                  []),
                                    } satisfies MediaSectionState
                                }
                                onChange={() => undefined}
                            />
                            {(artistRecommendedLoading ||
                                (artistData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={artistRecommendedLoading}
                                    section={
                                        {
                                            id: 'artist-recommended',
                                            title: 'Recommended',
                                            view: 'list',
                                            infinite: 'rows',
                                            rows: 0,
                                            trackSubtitleMode: 'artist-album',
                                            items: artistRecommendedLoading
                                                ? skeletonRows
                                                : (artistData?.recommended ??
                                                  []),
                                        } satisfies MediaSectionState
                                    }
                                    onChange={() => undefined}
                                />
                            )}
                            {(isLoadingView ||
                                (artistData?.discography?.length ?? 0) > 0) && (
                                <DiscographyShelf
                                    entries={artistData?.discography ?? []}
                                    sort={discographySort}
                                    onSortChange={setDiscographySort}
                                    trackCount={discographyTrackCount}
                                    locale={settings.locale}
                                    loading={isLoadingView}
                                    onAlbumClick={(album) =>
                                        album.id
                                            ? goTo(
                                                  '/media',
                                                  {
                                                      kind: 'album',
                                                      id: album.id,
                                                  },
                                                  {
                                                      samePathBehavior: 'push',
                                                  }
                                              )
                                            : undefined
                                    }
                                    onTrackClick={(track) =>
                                        track.id
                                            ? goTo(
                                                  '/media',
                                                  {
                                                      kind: 'track',
                                                      id: track.id,
                                                  },
                                                  {
                                                      samePathBehavior: 'push',
                                                  }
                                              )
                                            : undefined
                                    }
                                />
                            )}
                        </>
                    )}
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
