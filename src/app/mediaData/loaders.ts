import type { Dispatch, SetStateAction } from 'react';
import type {
    Album,
    Artist,
    Market,
    MaxInt,
    Show,
    SimplifiedAlbum,
    Track,
} from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../shared/async';
import { formatIsoDate } from '../../shared/date';
import {
    createLogger,
    createOptionalRequestLogger,
} from '../../shared/logging';
import {
    albumTrackToItem,
    artistToItem,
    showEpisodeToItem,
    showToItem,
    trackToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
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
import type { MediaContextRouteState, MediaDataState } from './types';

const logger = createLogger('media');

export const SHOW_EPISODE_PAGE_SIZE = 30;
export const ARTIST_DISCOGRAPHY_PAGE_SIZE = 20;

const suppressNotFound = (error: Error) => /\b404\b/.test(error.message);
const logOptionalError = createOptionalRequestLogger(logger);
const logOptionalNotFound = createOptionalRequestLogger(
    logger,
    'optional request failed',
    suppressNotFound
);

type SetMediaData = Dispatch<SetStateAction<MediaDataState | null>>;
type IsStale = () => boolean;
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

export const buildDiscographyEntries = async (
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

export const dedupeAlbums = <T extends SimplifiedAlbum | Album>(albums: T[]) =>
    Array.from(
        new Map(
            albums
                .filter((album): album is T & { id: string } =>
                    Boolean(album.id)
                )
                .map((album) => [album.id, album])
        ).values()
    );

export const mergeDiscographyEntries = (
    current: DiscographyEntry[],
    next: DiscographyEntry[]
) =>
    Array.from(
        new Map(
            [...current, ...next]
                .filter((entry) => Boolean(entry.album.id))
                .map((entry) => [entry.album.id!, entry])
        ).values()
    );

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
        (left, right) =>
            right.overlap - left.overlap || right.popularity - left.popularity
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
        discographyOffset: 0,
        discographyHasMore: false,
        discographyLoadingMore: false,
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
        const discographyAlbums = dedupeAlbums(discographySeed);
        const nextOffset = albumsPage?.offset + albumsPage?.items.length;
        const hasMore = nextOffset < (albumsPage?.total ?? nextOffset);
        if (!discographyAlbums.length) {
            patchByKind(isStale, setData, 'artist', (prev) => ({
                ...prev,
                discographyOffset: nextOffset ?? 0,
                discographyHasMore: hasMore,
            }));
            return;
        }

        const discography = await buildDiscographyEntries(
            discographyAlbums,
            market,
            discographyTrackCount
        );

        patchByKind(isStale, setData, 'artist', (prev) => ({
            ...prev,
            discography,
            discographyOffset: nextOffset ?? discographyAlbums.length,
            discographyHasMore: hasMore,
            discographyLoadingMore: false,
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

export const loadMediaContextData = async (
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
    }
};
