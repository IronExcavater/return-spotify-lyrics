import type {
    Album,
    Artist,
    Episode,
    Playlist,
    Show,
    SimplifiedAlbum,
    SimplifiedArtist,
    SimplifiedAudiobook,
    SimplifiedEpisode,
    SimplifiedShow,
    SimplifiedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';

import { formatIsoDate, formatDurationShort } from './date';
import type { MediaArtist, MediaItem } from './types';

type SpotifyImage = {
    url: string;
};

type AlbumTypeSource = {
    album_type?: string;
    album_group?: string;
    total_tracks?: number;
};

type AlbumContext = Pick<
    Album,
    'id' | 'images' | 'external_urls' | 'name' | 'total_tracks'
>;

type ShowContext = Pick<Show, 'id' | 'images' | 'external_urls'>;

const SPOTIFY_PATH_ID_PATTERN =
    /\/(?:track|episode|album|artist|show|playlist)\/([^/]+)/;

const getImageUrl = (images?: SpotifyImage[] | null) => images?.[0]?.url;

const toMediaArtists = (
    artists?: Array<Pick<SimplifiedArtist, 'id' | 'name'>> | null
): MediaArtist[] | undefined => {
    if (!artists?.length) return undefined;

    return artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
    }));
};

const formatArtists = (
    artists?: Array<Pick<SimplifiedArtist, 'name'>> | null
) => {
    const names = artists?.map((artist) => artist.name).filter(Boolean);
    if (!names?.length) return undefined;

    return names.join(', ');
};

const getEpisodeShow = (
    episode: SimplifiedEpisode | Episode
): SimplifiedShow | undefined =>
    (episode as SimplifiedEpisode & { show?: SimplifiedShow }).show;

const resolveEpisodeImageUrl = (
    episode: SimplifiedEpisode | Episode,
    show?: Pick<Show, 'images'>
) => {
    const episodeShow = getEpisodeShow(episode);

    return (
        getImageUrl(show?.images) ??
        getImageUrl(episodeShow?.images) ??
        getImageUrl(episode.images)
    );
};

const resolveEpisodeExternalUrl = (
    episode: SimplifiedEpisode | Episode,
    show?: Pick<Show, 'external_urls'>
) => {
    const episodeShow = getEpisodeShow(episode);

    return (
        episode.external_urls?.spotify ??
        show?.external_urls?.spotify ??
        episodeShow?.external_urls?.spotify
    );
};

const resolveEpisodeParentId = (
    episode: SimplifiedEpisode | Episode,
    show?: Pick<Show, 'id'>
) => {
    const episodeShow = getEpisodeShow(episode);
    return show?.id ?? episodeShow?.id;
};

const createTrackMediaItem = (
    track: Pick<
        SimplifiedTrack,
        'id' | 'uri' | 'name' | 'artists' | 'external_urls'
    >,
    album?: AlbumContext
): MediaItem => ({
    id: track.id ?? track.uri ?? track.name,
    title: track.name,
    subtitle: formatArtists(track.artists),
    artists: toMediaArtists(track.artists),
    imageUrl: getImageUrl(album?.images),
    uri: track.uri,
    externalUrl: track.external_urls?.spotify,
    kind: 'track',
    parentKind: album?.id ? 'album' : undefined,
    parentId: album?.id,
    parentTitle: album?.name,
    parentIsSingle: album?.total_tracks === 1,
});

const createCollectionMediaItem = ({
    id,
    uri,
    title,
    subtitle,
    imageUrl,
    externalUrl,
    kind,
    artists,
}: {
    id?: string | null;
    uri?: string | null;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    externalUrl?: string;
    kind: MediaItem['kind'];
    artists?: MediaArtist[];
}): MediaItem => ({
    id: id ?? uri ?? title,
    title,
    subtitle,
    artists,
    imageUrl,
    uri: uri ?? undefined,
    externalUrl,
    kind,
});

export const resolveSpotifyMediaId = (value: string) => {
    if (value.startsWith('spotify:')) {
        const parts = value.split(':');
        const parsed = parts.at(-1);
        if (parsed) return parsed;
    }

    try {
        const url = new URL(value);
        const match = url.pathname.match(SPOTIFY_PATH_ID_PATTERN);
        if (match?.[1]) return match[1];
    } catch {
        // Keep the original string when the value is not a URL.
    }

    return value;
};

export const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

export type TrackPlaylistTarget = {
    trackId: string;
    trackUri: string;
};

const parseSpotifyTrackId = (value?: string) => {
    if (!value) return undefined;

    const uriMatch = /^spotify:track:([A-Za-z0-9]{22})$/.exec(value);
    if (uriMatch) return uriMatch[1];

    return SPOTIFY_ID_PATTERN.test(value) ? value : undefined;
};

export const resolveTrackPlaylistTarget = (
    item?: MediaItem | null
): TrackPlaylistTarget | null => {
    if (item?.kind !== 'track') return null;

    const trackId =
        parseSpotifyTrackId(item.id) ?? parseSpotifyTrackId(item.uri);
    if (!trackId) return null;

    const trackUri = item.uri?.startsWith('spotify:track:')
        ? item.uri
        : `spotify:track:${trackId}`;

    return { trackId, trackUri };
};

export const canManageTrackPlaylists = (item?: MediaItem | null) =>
    Boolean(resolveTrackPlaylistTarget(item));

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

export const trackToItem = (track: Track): MediaItem =>
    createTrackMediaItem(track, track.album);

export const albumTrackToItem = (
    track: SimplifiedTrack,
    album: AlbumContext
): MediaItem => createTrackMediaItem(track, album);

export const albumToItem = (album: SimplifiedAlbum | Album): MediaItem =>
    createCollectionMediaItem({
        id: album.id,
        uri: album.uri,
        title: album.name,
        subtitle: formatArtists(album.artists),
        artists: toMediaArtists(album.artists),
        imageUrl: getImageUrl(album.images),
        externalUrl: album.external_urls?.spotify,
        kind: 'album',
    });

type PlaylistItemSource = Pick<
    Playlist<Track>,
    'id' | 'uri' | 'name' | 'owner' | 'images' | 'external_urls'
>;

export const playlistToItem = (playlist: PlaylistItemSource): MediaItem =>
    createCollectionMediaItem({
        id: playlist.id,
        uri: playlist.uri,
        title: playlist.name,
        subtitle: playlist.owner?.display_name
            ? `By ${playlist.owner.display_name}`
            : undefined,
        imageUrl: getImageUrl(playlist.images),
        externalUrl: playlist.external_urls?.spotify,
        kind: 'playlist',
    });

export const showToItem = (show: SimplifiedShow | Show): MediaItem =>
    createCollectionMediaItem({
        id: show.id,
        uri: show.uri,
        title: show.name,
        subtitle: show.publisher || undefined,
        imageUrl: getImageUrl(show.images),
        externalUrl: show.external_urls?.spotify,
        kind: 'show',
    });

export const episodeToItem = (
    episode: SimplifiedEpisode | Episode,
    locale?: string,
    show?: ShowContext
): MediaItem => ({
    id: episode.id ?? episode.uri ?? episode.name,
    title: episode.name,
    subtitle:
        formatDurationShort(episode.duration_ms) ??
        formatIsoDate(episode.release_date, { dateStyle: 'medium' }, locale) ??
        undefined,
    imageUrl: resolveEpisodeImageUrl(episode, show),
    uri: episode.uri,
    externalUrl: resolveEpisodeExternalUrl(episode, show),
    kind: 'episode',
    parentKind: resolveEpisodeParentId(episode, show) ? 'show' : undefined,
    parentId: resolveEpisodeParentId(episode, show),
});

export const showEpisodeToItem = (
    episode: SimplifiedEpisode,
    show: ShowContext,
    locale?: string
): MediaItem => episodeToItem(episode, locale, show);

const isEpisodeItem = (item: Track | Episode): item is Episode =>
    item.type === 'episode' || 'show' in item;

export const trackOrEpisodeToItem = (
    item: Track | Episode,
    locale?: string,
    show?: ShowContext
): MediaItem => {
    if (isEpisodeItem(item)) {
        return episodeToItem(item, locale, show ?? item.show);
    }

    return trackToItem(item);
};

export const audiobookToItem = (book: SimplifiedAudiobook): MediaItem =>
    createCollectionMediaItem({
        id: book.id,
        uri: book.uri,
        title: book.name,
        subtitle: book.publisher || undefined,
        imageUrl: getImageUrl(book.images),
        externalUrl: book.external_urls?.spotify,
        kind: 'audiobook',
    });

export const artistToItem = (artist: SimplifiedArtist | Artist): MediaItem =>
    createCollectionMediaItem({
        id: artist.id,
        uri: artist.uri,
        title: artist.name,
        subtitle:
            'followers' in artist && artist.followers?.total != null
                ? artist.followers.total.toLocaleString()
                : undefined,
        imageUrl: 'images' in artist ? getImageUrl(artist.images) : undefined,
        externalUrl: artist.external_urls?.spotify,
        kind: 'artist',
    });

export const topArtistToItem = (artist: Artist): MediaItem =>
    artistToItem(artist);
