import type {
    Album,
    Market,
    MaxInt,
    SimplifiedAlbum,
} from '@spotify/web-api-ts-sdk';

import type {
    AlbumMediaSource,
    AlbumTrackGroup,
} from '../../../../shared/media';
import { sendSpotifyMessage } from '../../../../shared/messaging';

export const ARTIST_DISCOGRAPHY_PAGE_SIZE = 20;

type DiscographyEntriesRequest = {
    albums: DiscographyAlbum[];
    market: Market;
    trackCount: number;
};

type DiscographyAlbum = (SimplifiedAlbum | Album) & { id: string };

export async function loadDiscographyEntries({
    albums,
    market,
    trackCount,
}: DiscographyEntriesRequest): Promise<AlbumTrackGroup[]> {
    const limit = Math.min(trackCount, 10) as MaxInt<50>;
    return Promise.all(
        albums.map(async (album) => {
            const tracksPage = await sendSpotifyMessage('getAlbumTracks', {
                id: album.id,
                market,
                limit,
            });

            return {
                album: toAlbumMediaSource(album),
                tracks: tracksPage.items,
            };
        })
    );
}

export function uniqueAlbumsById<T extends SimplifiedAlbum | Album>(
    albums: T[]
) {
    return Array.from(
        new Map(
            albums
                .filter((album): album is T & { id: string } =>
                    Boolean(album.id)
                )
                .map((album) => [album.id, album])
        ).values()
    );
}

function toAlbumMediaSource(album: SimplifiedAlbum | Album): AlbumMediaSource {
    return {
        album_group:
            'album_group' in album ? album.album_group : album.album_type,
        album_type: album.album_type,
        artists: album.artists,
        external_urls: album.external_urls,
        id: album.id,
        images: album.images,
        name: album.name,
        release_date: album.release_date,
        total_tracks: album.total_tracks,
        uri: album.uri,
    };
}

export function mergeDiscographyByAlbumId(
    current: AlbumTrackGroup[],
    next: AlbumTrackGroup[]
) {
    return Array.from(
        new Map(
            [...current, ...next]
                .filter((entry) => Boolean(entry.album.id))
                .map((entry) => [entry.album.id!, entry])
        ).values()
    );
}
