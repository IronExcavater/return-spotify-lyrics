import type { Artist, Market, Track } from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../../../shared/async';
import { artistToItem, trackToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    buildGenreRecommendationQuery,
    buildTrackRecommendationQuery,
    searchItems,
} from '../../../utils/mediaSearch';
import {
    ARTIST_DISCOGRAPHY_PAGE_SIZE,
    buildDiscographyEntries,
    dedupeAlbums,
} from './discography';
import {
    logOptionalError,
    logOptionalNotFound,
    patchByKind,
    setIfFresh,
    type IsStale,
    type SetMediaData,
} from './loadContext';

export async function loadArtistData({
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
}) {
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

    void loadRelatedArtists({
        artist,
        artistId: id,
        relatedArtists: relatedArtists.artists,
        fallbackRelatedItems: fansAlsoLike,
        setData,
        isStale,
        logSearchError,
    });

    void loadArtistDiscography({
        artistId: id,
        market,
        discographyTrackCount,
        setData,
        isStale,
    });

    void loadArtistRecommendations({
        artist,
        topTrackIds: topTracks.tracks
            .map((track) => track.id)
            .filter((trackId): trackId is string => Boolean(trackId)),
        setData,
        isStale,
        logSearchError,
    });
}

async function loadRelatedArtists({
    artist,
    artistId,
    relatedArtists,
    fallbackRelatedItems,
    setData,
    isStale,
    logSearchError,
}: {
    artist: Artist;
    artistId: string;
    relatedArtists: Artist[];
    fallbackRelatedItems: ReturnType<typeof artistToItem>[];
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) {
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
                      .filter((item) => item.id && item.id !== artistId),
              logSearchError
          )
        : [];

    const shouldUseNameFallback =
        fallbackRelatedItems.length === 0 && genreCandidates.length === 0;

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
                      .filter((item) => item.id && item.id !== artistId)
                      .filter((item) => (item.popularity ?? 0) >= 20),
              logSearchError
          )
        : [];

    const merged = Array.from(
        new Map(
            [...relatedArtists, ...genreCandidates, ...nameCandidates]
                .filter((item) => item.id && item.id !== artistId)
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
}

async function loadArtistDiscography({
    artistId,
    market,
    discographyTrackCount,
    setData,
    isStale,
}: {
    artistId: string;
    market: Market;
    discographyTrackCount: number;
    setData: SetMediaData;
    isStale: IsStale;
}) {
    const albumsPage = await safeRequest(
        () =>
            sendSpotifyMessage('getArtistAlbums', {
                id: artistId,
                market,
                limit: ARTIST_DISCOGRAPHY_PAGE_SIZE,
            }),
        null,
        logOptionalError
    );

    const discographySeed = albumsPage?.items?.filter((item) => item.id) ?? [];
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
}

async function loadArtistRecommendations({
    artist,
    topTrackIds,
    setData,
    isStale,
    logSearchError,
}: {
    artist: Artist;
    topTrackIds: string[];
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) {
    const query = buildTrackRecommendationQuery({
        artistName: artist.name,
    });
    const knownTopTrackIds = new Set(topTrackIds);

    const recommended = await searchItems(
        query,
        ['track'],
        (results) =>
            (results.tracks?.items ?? [])
                .filter(
                    (item): item is Track =>
                        typeof item === 'object' && item !== null
                )
                .filter((item) => item.id && !knownTopTrackIds.has(item.id))
                .map(trackToItem),
        logSearchError
    );

    patchByKind(isStale, setData, 'artist', (prev) => ({
        ...prev,
        recommended,
        recommendedLoading: false,
    }));
}

function rankRelatedArtists(artists: Artist[], seedGenres?: string[]) {
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
}
