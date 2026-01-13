import type {
    Artist,
    SimplifiedAlbum,
    SimplifiedArtist,
    SimplifiedAudiobook,
    SimplifiedEpisode,
    SimplifiedPlaylist,
    SimplifiedShow,
    Track,
} from '@spotify/web-api-ts-sdk';

import { formatIsoDate } from './date';
import type { MediaItem } from './types';

const getImageUrl = (images?: { url: string }[]) => images?.[0]?.url;

const formatArtists = (artists?: SimplifiedArtist[]) =>
    artists?.map((artist) => artist.name).join(', ');

export const trackToItem = (track: Track): MediaItem => ({
    id: track.id ?? track.uri ?? track.name,
    title: track.name,
    subtitle: formatArtists(track.artists),
    imageUrl: getImageUrl(track.album?.images),
});

export const albumToItem = (album: SimplifiedAlbum): MediaItem => ({
    id: album.id ?? album.uri ?? album.name,
    title: album.name,
    subtitle: formatArtists(album.artists),
    imageUrl: getImageUrl(album.images),
});

export const playlistToItem = (playlist: SimplifiedPlaylist): MediaItem => ({
    id: playlist.id ?? playlist.uri ?? playlist.name,
    title: playlist.name,
    subtitle: playlist.owner?.display_name
        ? `By ${playlist.owner.display_name}`
        : undefined,
    imageUrl: getImageUrl(playlist.images),
});

export const showToItem = (show: SimplifiedShow): MediaItem => ({
    id: show.id ?? show.uri ?? show.name,
    title: show.name,
    subtitle: show.publisher || undefined,
    imageUrl: getImageUrl(show.images),
});

const formatDuration = (ms?: number) => {
    if (!ms) return undefined;
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(
            seconds
        ).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const episodeToItem = (
    episode: SimplifiedEpisode,
    locale?: string
): MediaItem => ({
    id: episode.id ?? episode.uri ?? episode.name,
    title: episode.name,
    subtitle:
        formatDuration(episode.duration_ms) ??
        formatIsoDate(episode.release_date, { dateStyle: 'medium' }, locale) ??
        undefined,
    imageUrl: getImageUrl(episode.images),
});

export const audiobookToItem = (book: SimplifiedAudiobook): MediaItem => ({
    id: book.id ?? book.uri ?? book.name,
    title: book.name,
    subtitle: book.publisher || undefined,
    imageUrl: getImageUrl(book.images),
});

export const artistToItem = (artist: SimplifiedArtist | Artist): MediaItem => {
    const imageUrl =
        'images' in artist ? getImageUrl(artist.images) : undefined;
    const genres = 'genres' in artist ? artist.genres : undefined;
    return {
        id: artist.id ?? artist.uri ?? artist.name,
        title: artist.name,
        subtitle: genres?.length ? genres.slice(0, 2).join(' • ') : undefined,
        imageUrl,
    };
};

export const topArtistToItem = (artist: Artist): MediaItem => ({
    id: artist.id ?? artist.uri ?? artist.name,
    title: artist.name,
    subtitle:
        artist.followers?.total != null
            ? artist.followers.total.toLocaleString()
            : artist.popularity
              ? `Popularity ${artist.popularity}`
              : 'Top artist',
    imageUrl: getImageUrl(artist.images),
});
