import type {
    Album,
    Market,
    MaxInt,
    SimplifiedAlbum,
} from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../../../shared/async';
import { sendSpotifyMessage } from '../../../../shared/messaging';
import type { DiscographyEntry } from '../../../components/media/DiscographyShelf';
import { logOptionalError } from './loadContext';

export const ARTIST_DISCOGRAPHY_PAGE_SIZE = 20;

export async function buildDiscographyEntries(
    albums: Array<SimplifiedAlbum | Album>,
    market: Market,
    trackCount: number
): Promise<DiscographyEntry[]> {
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
}

export function dedupeAlbums<T extends SimplifiedAlbum | Album>(albums: T[]) {
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

export function mergeDiscographyEntries(
    current: DiscographyEntry[],
    next: DiscographyEntry[]
) {
    return Array.from(
        new Map(
            [...current, ...next]
                .filter((entry) => Boolean(entry.album.id))
                .map((entry) => [entry.album.id!, entry])
        ).values()
    );
}
