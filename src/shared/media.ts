import type {
    Artist,
    SimplifiedAlbum,
    SimplifiedArtist,
    SimplifiedAudiobook,
    SimplifiedEpisode,
    SimplifiedPlaylist,
    SimplifiedShow,
    SimplifiedTrack,
    Show,
    Album,
    Track,
} from '@spotify/web-api-ts-sdk';

import { formatIsoDate, formatDurationShort } from './date';
import type { MediaItem } from './types';

const getImageUrl = (images?: { url: string }[]) => images?.[0]?.url;

const formatArtists = (artists?: SimplifiedArtist[]) =>
    artists?.map((artist) => artist.name).join(', ');

type AlbumTypeSource = {
    album_type?: string;
    album_group?: string;
    total_tracks?: number;
};

export const formatAlbumType = (album: AlbumTypeSource) => {
    const raw = album.album_group ?? album.album_type;
    if (!raw) return undefined;
    if (raw === 'album') return 'Album';
    if (raw === 'compilation') return 'Compilation';
    if (raw === 'appears_on') return 'Appears On';
    if (raw === 'single') {
        if ((album.total_tracks ?? 0) > 1) return 'EP';
        return 'Single';
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const trackToItem = (track: Track): MediaItem => ({
    id: track.id ?? track.uri ?? track.name,
    title: track.name,
    subtitle: formatArtists(track.artists),
    imageUrl: getImageUrl(track.album?.images),
    uri: track.uri,
    externalUrl: track.external_urls?.spotify,
    artistUrl: track.artists?.[0]?.external_urls?.spotify,
    kind: 'track',
    parentKind: track.album?.id ? 'album' : undefined,
    parentId: track.album?.id,
});

export const albumToItem = (album: SimplifiedAlbum | Album): MediaItem => ({
    id: album.id ?? album.uri ?? album.name,
    title: album.name,
    subtitle: formatArtists(album.artists),
    imageUrl: getImageUrl(album.images),
    uri: album.uri,
    externalUrl: album.external_urls?.spotify,
    artistUrl: album.artists?.[0]?.external_urls?.spotify,
    kind: 'album',
});

export const playlistToItem = (playlist: SimplifiedPlaylist): MediaItem => ({
    id: playlist.id ?? playlist.uri ?? playlist.name,
    title: playlist.name,
    subtitle: playlist.owner?.display_name
        ? `By ${playlist.owner.display_name}`
        : undefined,
    imageUrl: getImageUrl(playlist.images),
    uri: playlist.uri,
    externalUrl: playlist.external_urls?.spotify,
    kind: 'playlist',
});

export const showToItem = (show: SimplifiedShow): MediaItem => ({
    id: show.id ?? show.uri ?? show.name,
    title: show.name,
    subtitle: show.publisher || undefined,
    imageUrl: getImageUrl(show.images),
    uri: show.uri,
    externalUrl: show.external_urls?.spotify,
    kind: 'show',
});

export const episodeToItem = (
    episode: SimplifiedEpisode,
    locale?: string,
    show?: Pick<Show, 'id' | 'images' | 'external_urls'>
): MediaItem => ({
    id: episode.id ?? episode.uri ?? episode.name,
    title: episode.name,
    subtitle:
        formatDurationShort(episode.duration_ms) ??
        formatIsoDate(episode.release_date, { dateStyle: 'medium' }, locale) ??
        undefined,
    imageUrl: getImageUrl(show?.images) ?? getImageUrl(episode.images),
    uri: episode.uri,
    externalUrl: episode.external_urls?.spotify ?? show?.external_urls?.spotify,
    kind: 'episode',
    parentKind: show?.id ? 'show' : undefined,
    parentId: show?.id,
});

export const audiobookToItem = (book: SimplifiedAudiobook): MediaItem => ({
    id: book.id ?? book.uri ?? book.name,
    title: book.name,
    subtitle: book.publisher || undefined,
    imageUrl: getImageUrl(book.images),
    uri: book.uri,
    externalUrl: book.external_urls?.spotify,
    kind: 'audiobook',
});

export const artistToItem = (artist: SimplifiedArtist | Artist): MediaItem => {
    const imageUrl =
        'images' in artist ? getImageUrl(artist.images) : undefined;
    return {
        id: artist.id ?? artist.uri ?? artist.name,
        title: artist.name,
        subtitle:
            'followers' in artist && artist.followers?.total != null
                ? artist.followers.total.toLocaleString()
                : undefined,
        imageUrl,
        uri: artist.uri,
        externalUrl: artist.external_urls?.spotify,
        kind: 'artist',
    };
};

export const topArtistToItem = (artist: Artist): MediaItem => ({
    id: artist.id ?? artist.uri ?? artist.name,
    title: artist.name,
    subtitle:
        artist.followers?.total != null
            ? artist.followers.total.toLocaleString()
            : undefined,
    imageUrl: getImageUrl(artist.images),
    uri: artist.uri,
    externalUrl: artist.external_urls?.spotify,
    kind: 'artist',
});

export const albumTrackToItem = (
    track: SimplifiedTrack,
    album: Pick<Album, 'id' | 'images' | 'external_urls'>
): MediaItem => ({
    id: track.id ?? track.uri ?? track.name,
    title: track.name,
    subtitle: formatArtists(track.artists),
    imageUrl: getImageUrl(album.images),
    uri: track.uri,
    externalUrl: track.external_urls?.spotify,
    artistUrl: track.artists?.[0]?.external_urls?.spotify,
    kind: 'track',
    parentKind: 'album',
    parentId: album.id,
});

export const showEpisodeToItem = (
    episode: SimplifiedEpisode,
    show: Pick<Show, 'id' | 'images' | 'external_urls'>,
    locale?: string
): MediaItem => episodeToItem(episode, locale, show);
