import type { Market, Track } from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../../../shared/async';
import { albumTrackToItem, trackToItem } from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import { buildTrackLookup, sumDurationMs } from '../../../utils/mediaLookup';
import {
    buildTrackRecommendationQuery,
    searchItems,
} from '../../../utils/mediaSearch';
import {
    logOptionalError,
    patchByKind,
    setIfFresh,
    type IsStale,
    type SetMediaData,
} from './loadContext';

export async function loadAlbumData({
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
}) {
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
        void loadAlbumArtistTopTracks({
            artistId: mainArtistId,
            market,
            setData,
            isStale,
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
            setData,
            isStale,
            logSearchError,
        });
    }
}

async function loadAlbumArtistTopTracks({
    artistId,
    market,
    setData,
    isStale,
}: {
    artistId: string;
    market: Market;
    setData: SetMediaData;
    isStale: IsStale;
}) {
    const topTracks = await safeRequest(
        () =>
            sendSpotifyMessage('getArtistTopTracks', {
                id: artistId,
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
}

async function loadAlbumRecommendations({
    albumName,
    artistName,
    selectedTrackName,
    trackIds,
    setData,
    isStale,
    logSearchError,
}: {
    albumName: string;
    artistName: string;
    selectedTrackName?: string;
    trackIds: string[];
    setData: SetMediaData;
    isStale: IsStale;
    logSearchError: (error: unknown) => void;
}) {
    const knownTrackIds = new Set(trackIds);
    const query = buildTrackRecommendationQuery({
        artistName,
        trackName: selectedTrackName,
        albumName,
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
                .filter((item) => item.id && !knownTrackIds.has(item.id))
                .map(trackToItem),
        logSearchError
    );

    patchByKind(isStale, setData, 'album', (prev) => ({
        ...prev,
        recommended,
        recommendedLoading: false,
    }));
}
