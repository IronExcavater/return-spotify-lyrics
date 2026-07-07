import type { Track } from '@spotify/web-api-ts-sdk';

import { albumTrackToItem, trackToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import {
    buildTrackLookup,
    findByMediaId,
    sumDurationMs,
} from '../../../utils/mediaLookup';
import {
    createTrackSearchQuery,
    isSearchResultItem,
    searchMediaItems,
} from '../../../utils/mediaSearch';
import type { MediaContextRouteState } from '../model/types';
import {
    patchByKind,
    requestOptional,
    setIfFresh,
    type MediaDataLoadContext,
} from './loadContext';

type AlbumLoadRequest = {
    route: Extract<MediaContextRouteState, { kind: 'album' }>;
    context: MediaDataLoadContext;
};

export async function loadAlbumView({ route, context }: AlbumLoadRequest) {
    const { id, selectedId } = route;
    const { market, setData, isStale } = context;

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
    const selectedTrack = findByMediaId(trackLookup, selectedId);
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
        void loadAlbumPopularTracks({
            artistId: mainArtistId,
            context,
        });
    }

    if (mainArtistName) {
        void loadAlbumRecommendations({
            albumName: album.name,
            artistName: mainArtistName,
            selectedTrackName: selectedTrack?.name,
            trackIds: tracksPage.items
                .map((track) => track.id)
                .filter((trackId): trackId is string => Boolean(trackId)),
            context,
        });
    }
}

async function loadAlbumPopularTracks({
    artistId,
    context,
}: {
    artistId: string;
    context: MediaDataLoadContext;
}) {
    const { market, setData, isStale } = context;
    const topTracks = await requestOptional(() =>
        sendSpotifyMessage('getArtistTopTracks', {
            id: artistId,
            market,
        })
    );

    patchByKind(isStale, setData, 'album', (prev) => ({
        ...prev,
        artistTopTracks: topTracks?.tracks.map(trackToItem) ?? [],
        popularLoading: false,
    }));
}

async function loadAlbumRecommendations({
    albumName,
    artistName,
    selectedTrackName,
    trackIds,
    context,
}: {
    albumName: string;
    artistName: string;
    selectedTrackName?: string;
    trackIds: string[];
    context: MediaDataLoadContext;
}) {
    const { setData, isStale, logSearchError } = context;
    const knownTrackIds = new Set(trackIds);
    const query = createTrackSearchQuery({
        artistName,
        trackName: selectedTrackName,
        albumName,
    });

    const recommended = await searchMediaItems({
        query,
        types: ['track'],
        select: (results) =>
            (results.tracks?.items ?? [])
                .filter(isSearchResultItem<Track>)
                .filter((item) => item.id && !knownTrackIds.has(item.id))
                .map(trackToItem),
        onError: logSearchError,
    });

    patchByKind(isStale, setData, 'album', (prev) => ({
        ...prev,
        recommended,
        recommendedLoading: false,
    }));
}
