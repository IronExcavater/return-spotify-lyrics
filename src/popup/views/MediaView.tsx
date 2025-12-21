import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
    DiscIcon,
    MixerHorizontalIcon,
    PersonIcon,
    StackIcon,
} from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';
import type {
    Album,
    Artist,
    Episode,
    SimplifiedEpisode,
    SimplifiedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';
import { useParams } from 'react-router-dom';
import { sendSpotifyMessage } from '../../shared/messaging';
import { MediaCard } from '../components/MediaCard';
import { TrackMenu } from '../components/TrackMenu';
import { useRouteHistory } from '../hooks/useRouteHistory';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';

const MEDIA_TYPES = [
    'album',
    'artist',
    'playlist',
    'track',
    'show',
    'episode',
] as const;

type MediaType = (typeof MEDIA_TYPES)[number];

type MediaHeader = {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    typeLabel: string;
    meta?: string;
    description?: string;
    icon?: ReactNode;
};

type MediaItem = {
    id: string;
    type: MediaType;
    title: string;
    subtitle?: string;
    meta?: string;
    imageUrl?: string;
    imageShape?: 'round' | 'square';
    uri?: string;
    albumId?: string;
    artistId?: string;
};

type MediaSection = {
    title: string;
    items: MediaItem[];
};

const TYPE_LABELS: Record<MediaType, string> = {
    album: 'Album',
    artist: 'Artist',
    playlist: 'Playlist',
    track: 'Track',
    show: 'Show',
    episode: 'Episode',
};

const TYPE_ICONS: Record<MediaType, ReactNode> = {
    album: <DiscIcon />,
    artist: <PersonIcon />,
    playlist: <StackIcon />,
    track: <DiscIcon />,
    show: <MixerHorizontalIcon />,
    episode: <MixerHorizontalIcon />,
};

const isMediaType = (value?: string): value is MediaType =>
    MEDIA_TYPES.includes(value as MediaType);

const formatDuration = (ms?: number | null) => {
    if (!ms && ms !== 0) return undefined;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatYear = (value?: string | null) =>
    value ? value.slice(0, 4) : undefined;

const joinNames = (items?: Array<{ name: string }> | null) =>
    items
        ?.map((item) => item.name)
        .filter(Boolean)
        .join(', ');

const albumTypeLabel = (album: Album) => {
    if (album.album_type === 'single') return 'Single';
    if (album.album_type === 'compilation') return 'Compilation';
    return 'Album';
};

export function MediaView() {
    const routeHistory = useRouteHistory();
    const { type: rawType, id } = useParams();
    const { profile } = useSpotifyAuth();

    const type = isMediaType(rawType) ? rawType : undefined;
    const market = useMemo(() => profile?.country ?? 'US', [profile?.country]);

    const [header, setHeader] = useState<MediaHeader | null>(null);
    const [sections, setSections] = useState<MediaSection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        if (!type || !id) {
            setHeader(null);
            setSections([]);
            setError('Unknown media.');
            setLoading(false);
            return () => {
                active = false;
            };
        }

        const load = async () => {
            setLoading(true);
            setError(null);
            setHeader(null);
            setSections([]);
            try {
                if (type === 'album') {
                    const album = await sendSpotifyMessage('getAlbum', {
                        id,
                        market,
                    });
                    const tracks = await sendSpotifyMessage('getAlbumTracks', {
                        albumId: id,
                        market,
                        limit: 50,
                    });

                    const albumImage = album.images?.[0]?.url;
                    const items = tracks.items.map((track) =>
                        mapTrackItem(track, {
                            albumImage,
                            albumId: album.id,
                        })
                    );

                    if (!active) return;
                    setHeader({
                        title: album.name,
                        subtitle: joinNames(album.artists),
                        imageUrl: albumImage,
                        typeLabel: albumTypeLabel(album),
                        meta: [
                            formatYear(album.release_date),
                            `${album.total_tracks} tracks`,
                        ]
                            .filter(Boolean)
                            .join(' • '),
                        description: album.label,
                        icon: TYPE_ICONS.album,
                    });
                    setSections([{ title: 'Tracks', items }]);
                }

                if (type === 'playlist') {
                    const playlist = await sendSpotifyMessage('getPlaylist', {
                        id,
                        market,
                    });

                    const items = (playlist.tracks?.items ?? [])
                        .map((item) => mapPlaylistItem(item?.track))
                        .filter(Boolean) as MediaItem[];

                    if (!active) return;
                    setHeader({
                        title: playlist.name,
                        subtitle: playlist.owner?.display_name,
                        imageUrl: playlist.images?.[0]?.url,
                        typeLabel: TYPE_LABELS.playlist,
                        meta: `${playlist.tracks?.total ?? items.length} tracks`,
                        description: playlist.description || undefined,
                        icon: TYPE_ICONS.playlist,
                    });
                    setSections([{ title: 'Tracks', items }]);
                }

                if (type === 'track') {
                    const track = await sendSpotifyMessage('getTrack', {
                        id,
                        market,
                    });
                    const album = track.album;
                    const artistItems = (track.artists ?? []).map((artist) =>
                        mapArtistItem(artist)
                    );

                    if (!active) return;
                    setHeader({
                        title: track.name,
                        subtitle: joinNames(track.artists),
                        imageUrl: album?.images?.[0]?.url,
                        typeLabel: TYPE_LABELS.track,
                        meta: [album?.name, formatDuration(track.duration_ms)]
                            .filter(Boolean)
                            .join(' • '),
                        icon: TYPE_ICONS.track,
                    });

                    const nextSections: MediaSection[] = [];
                    if (album) {
                        nextSections.push({
                            title: 'From the album',
                            items: [
                                {
                                    id: album.id,
                                    type: 'album',
                                    title: album.name,
                                    subtitle: joinNames(album.artists),
                                    meta: formatYear(album.release_date),
                                    imageUrl: album.images?.[0]?.url,
                                },
                            ],
                        });
                    }
                    if (artistItems.length > 0) {
                        nextSections.push({
                            title: 'Artists',
                            items: artistItems,
                        });
                    }
                    setSections(nextSections);
                }

                if (type === 'artist') {
                    const artist = await sendSpotifyMessage('getArtist', id);
                    const topTracks = await sendSpotifyMessage(
                        'getArtistTopTracks',
                        { id, market }
                    );

                    if (!active) return;
                    setHeader({
                        title: artist.name,
                        subtitle: artist.genres?.slice(0, 3).join(' • '),
                        imageUrl: artist.images?.[0]?.url,
                        typeLabel: TYPE_LABELS.artist,
                        meta: artist.followers?.total
                            ? `${artist.followers.total.toLocaleString()} followers`
                            : undefined,
                        icon: TYPE_ICONS.artist,
                    });
                    setSections([
                        {
                            title: 'Top tracks',
                            items: topTracks.tracks.map((track) =>
                                mapTrackItem(track)
                            ),
                        },
                    ]);
                }

                if (type === 'show') {
                    const show = await sendSpotifyMessage('getShow', {
                        id,
                        market,
                    });
                    const episodes = await sendSpotifyMessage(
                        'getShowEpisodes',
                        {
                            id,
                            market,
                            limit: 50,
                        }
                    );

                    if (!active) return;
                    setHeader({
                        title: show.name,
                        subtitle: show.publisher,
                        imageUrl: show.images?.[0]?.url,
                        typeLabel: TYPE_LABELS.show,
                        meta: `${show.total_episodes ?? episodes.items.length} episodes`,
                        description: show.description,
                        icon: TYPE_ICONS.show,
                    });
                    setSections([
                        {
                            title: 'Episodes',
                            items: episodes.items.map((episode) =>
                                mapEpisodeItem(episode)
                            ),
                        },
                    ]);
                }

                if (type === 'episode') {
                    const episode = await sendSpotifyMessage('getEpisode', {
                        id,
                        market,
                    });
                    const show = episode.show;

                    if (!active) return;
                    setHeader({
                        title: episode.name,
                        subtitle: show?.name,
                        imageUrl: episode.images?.[0]?.url,
                        typeLabel: TYPE_LABELS.episode,
                        meta: formatDuration(episode.duration_ms),
                        description: episode.description,
                        icon: TYPE_ICONS.episode,
                    });

                    const nextSections: MediaSection[] = [];
                    if (show) {
                        nextSections.push({
                            title: 'From the show',
                            items: [
                                {
                                    id: show.id,
                                    type: 'show',
                                    title: show.name,
                                    subtitle: show.publisher,
                                    imageUrl: show.images?.[0]?.url,
                                },
                            ],
                        });
                    }
                    setSections(nextSections);
                }
            } catch (err) {
                if (!active) return;
                setError(
                    err instanceof Error ? err.message : 'Failed to load media.'
                );
                setHeader(null);
                setSections([]);
            } finally {
                if (!active) return;
                setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [type, id, market]);

    const headerImage = header?.imageUrl ? (
        <img
            src={header.imageUrl}
            alt={header.title}
            className="h-24 w-24 rounded-xl object-cover"
        />
    ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-[var(--gray-a4)]">
            <Text size="4" color="gray">
                {header?.icon ?? (type ? TYPE_ICONS[type] : null)}
            </Text>
        </div>
    );

    const openMedia = (item: MediaItem) => {
        routeHistory.goTo(`/media/${item.type}/${item.id}`);
    };

    const openMediaByType = (
        mediaType: 'album' | 'artist',
        mediaId: string
    ) => {
        routeHistory.goTo(`/media/${mediaType}/${mediaId}`);
    };

    if (!type || !id) {
        return (
            <Flex
                flexGrow="1"
                direction="column"
                className="min-h-0 overflow-y-auto"
                p="4"
            >
                <Text size="3" color="gray">
                    {error ?? 'Choose something to view.'}
                </Text>
            </Flex>
        );
    }

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="min-h-0 overflow-y-auto"
        >
            <Flex m="3" direction="column" gap="3">
                {loading && (
                    <Text size="2" color="gray">
                        Loading media...
                    </Text>
                )}

                {error && (
                    <Text size="2" color="red">
                        {error}
                    </Text>
                )}

                {header && (
                    <Flex direction="column" gap="2">
                        <Flex gap="2" align="center">
                            {headerImage}
                            <Flex
                                direction="column"
                                gap="1"
                                className="min-w-0 flex-1"
                            >
                                <Text
                                    size="1"
                                    color="gray"
                                    className="uppercase"
                                >
                                    {header.typeLabel}
                                </Text>
                                <Text
                                    size="5"
                                    weight="bold"
                                    className="truncate"
                                >
                                    {header.title}
                                </Text>
                                {header.subtitle && (
                                    <Text
                                        size="2"
                                        color="gray"
                                        className="truncate"
                                    >
                                        {header.subtitle}
                                    </Text>
                                )}
                                {header.meta && (
                                    <Text size="2" color="gray">
                                        {header.meta}
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                        {header.description && (
                            <Text size="2" color="gray">
                                {header.description}
                            </Text>
                        )}
                    </Flex>
                )}

                {!loading &&
                    !error &&
                    sections.map((section) => (
                        <Flex key={section.title} direction="column" gap="2">
                            <Text size="3" weight="bold">
                                {section.title}
                            </Text>
                            {section.items.length === 0 ? (
                                <Text size="2" color="gray">
                                    Nothing to show yet.
                                </Text>
                            ) : (
                                <Flex direction="column" gap="2">
                                    {section.items.map((item) => (
                                        <MediaCard
                                            key={`${item.type}-${item.id}`}
                                            title={item.title}
                                            subtitle={item.subtitle}
                                            meta={item.meta}
                                            imageUrl={item.imageUrl}
                                            imageShape={item.imageShape}
                                            variant="row"
                                            action={
                                                item.type === 'track' ? (
                                                    <TrackMenu
                                                        trackUri={item.uri}
                                                        albumId={item.albumId}
                                                        artistId={item.artistId}
                                                        onOpenMedia={
                                                            openMediaByType
                                                        }
                                                    />
                                                ) : undefined
                                            }
                                            onClick={() => openMedia(item)}
                                        />
                                    ))}
                                </Flex>
                            )}
                        </Flex>
                    ))}
            </Flex>
        </Flex>
    );
}

function mapTrackItem(
    track: Track | SimplifiedTrack,
    options?: { albumImage?: string; albumId?: string }
) {
    const images = 'album' in track ? track.album?.images : undefined;

    return {
        id: track.id,
        type: 'track' as const,
        title: track.name,
        subtitle: joinNames(track.artists),
        meta: formatDuration(track.duration_ms),
        imageUrl: images?.[2]?.url ?? images?.[0]?.url ?? options?.albumImage,
        uri: track.uri,
        albumId: 'album' in track ? track.album?.id : options?.albumId,
        artistId: track.artists?.[0]?.id,
    };
}

function mapArtistItem(artist: Artist) {
    return {
        id: artist.id,
        type: 'artist' as const,
        title: artist.name,
        subtitle: artist.genres?.[0],
        imageUrl: artist.images?.[0]?.url,
        imageShape: 'round' as const,
    };
}

function mapEpisodeItem(episode: SimplifiedEpisode | Episode) {
    return {
        id: episode.id,
        type: 'episode' as const,
        title: episode.name,
        subtitle: episode.release_date,
        meta: formatDuration(episode.duration_ms),
        imageUrl: episode.images?.[2]?.url ?? episode.images?.[0]?.url,
    };
}

function mapPlaylistItem(item: Track | Episode | null | undefined) {
    if (!item) return null;

    if (item.type === 'episode') {
        return mapEpisodeItem(item);
    }

    return mapTrackItem(item);
}
