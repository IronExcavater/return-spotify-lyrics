import type { Artist, Track } from '@spotify/web-api-ts-sdk';

import { artistToItem, trackToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    createGenreSearchQuery,
    createTrackSearchQuery,
    isSearchResultItem,
    searchMediaItems,
} from '../../../utils/mediaSearch';
import type { MediaContextRouteState } from '../model/types';
import {
    logOptionalNotFound,
    patchByKind,
    requestOptional,
    setIfFresh,
    type MediaDataLoadContext,
} from './loadContext';
import { loadArtistDiscographyPage } from './pagination';

type ArtistLoadRequest = {
    route: Extract<MediaContextRouteState, { kind: 'artist' }>;
    context: MediaDataLoadContext;
};

export async function loadArtistView({ route, context }: ArtistLoadRequest) {
    const { id } = route;
    const { market, setData, isStale } = context;

    const [artist, topTracks, relatedArtists] = await Promise.all([
        sendSpotifyMessage('getArtist', { id }),
        sendSpotifyMessage('getArtistTopTracks', { id, market }),
        requestOptional(
            () => sendSpotifyMessage('getArtistRelatedArtists', { id }),
            logOptionalNotFound
        ),
    ]);
    if (isStale()) return;

    const fansAlsoLike = rankRelatedArtists(
        (relatedArtists?.artists ?? []).filter(
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
        relatedArtists: relatedArtists?.artists ?? [],
        fallbackRelatedItems: fansAlsoLike,
        context,
    });

    void loadArtistDiscography({
        artistId: id,
        context,
    });

    void loadArtistRecommendations({
        artist,
        topTrackIds: topTracks.tracks
            .map((track) => track.id)
            .filter((trackId): trackId is string => Boolean(trackId)),
        context,
    });
}

async function loadRelatedArtists({
    artist,
    artistId,
    relatedArtists,
    fallbackRelatedItems,
    context,
}: {
    artist: Artist;
    artistId: string;
    relatedArtists: Artist[];
    fallbackRelatedItems: ReturnType<typeof artistToItem>[];
    context: MediaDataLoadContext;
}) {
    const { setData, isStale, logSearchError } = context;
    const genreQuery = createGenreSearchQuery({ genres: artist.genres });
    const genreCandidates = genreQuery
        ? await searchMediaItems({
              query: genreQuery,
              types: ['artist'],
              select: (results) =>
                  (results.artists?.items ?? [])
                      .filter(isSearchResultItem<Artist>)
                      .filter((item) => item.id && item.id !== artistId),
              onError: logSearchError,
          })
        : [];

    const shouldUseNameFallback =
        fallbackRelatedItems.length === 0 && genreCandidates.length === 0;

    const nameCandidates = shouldUseNameFallback
        ? await searchMediaItems({
              query: artist.name,
              types: ['artist'],
              select: (results) =>
                  (results.artists?.items ?? [])
                      .filter(isSearchResultItem<Artist>)
                      .filter((item) => item.id && item.id !== artistId)
                      .filter((item) => (item.popularity ?? 0) >= 20),
              onError: logSearchError,
          })
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
    context,
}: {
    artistId: string;
    context: MediaDataLoadContext;
}) {
    const { market, discography, setData, isStale } = context;
    const page = await loadArtistDiscographyPage({
        artistId,
        offset: 0,
        market,
        trackCount: discography.trackCount,
        includeAppearances: discography.includeAppearances,
    });

    patchByKind(isStale, setData, 'artist', (prev) => ({
        ...prev,
        discography: page.entries,
        discographyOffset: page.nextOffset,
        discographyHasMore: page.hasMore,
        discographyLoadingMore: false,
    }));
}

async function loadArtistRecommendations({
    artist,
    topTrackIds,
    context,
}: {
    artist: Artist;
    topTrackIds: string[];
    context: MediaDataLoadContext;
}) {
    const { setData, isStale, logSearchError } = context;
    const query = createTrackSearchQuery({
        artistName: artist.name,
    });
    const knownTopTrackIds = new Set(topTrackIds);

    const recommended = await searchMediaItems({
        query,
        types: ['track'],
        select: (results) =>
            (results.tracks?.items ?? [])
                .filter(isSearchResultItem<Track>)
                .filter((item) => item.id && !knownTopTrackIds.has(item.id))
                .map(trackToItem),
        onError: logSearchError,
    });

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
