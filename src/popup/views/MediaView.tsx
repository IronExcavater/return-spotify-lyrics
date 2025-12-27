import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
    DiscIcon,
    MixerHorizontalIcon,
    PersonIcon,
    PlayIcon,
    StackIcon,
    DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import {
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import type {
    Album,
    Episode,
    SimplifiedEpisode,
    SimplifiedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';
import { useParams } from 'react-router-dom';
import { sendSpotifyMessage } from '../../shared/messaging';
import { AvatarButton } from '../components/AvatarButton';
import { Marquee } from '../components/Marquee';
import { TrackMenu } from '../components/TrackMenu';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';

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
    id?: string;
    mediaType: MediaType;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    imageShape?: 'round' | 'square';
    typeLabel: string;
    meta?: string;
    description?: string;
    icon?: ReactNode;
    contextUri?: string;
    uri?: string;
    artists?: { id?: string; name: string }[];
    album?: { id?: string; name: string; imageUrl?: string };
    saveIds?: string[];
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
    contextUri?: string;
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

const uniqueById = <T extends { id?: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = item.id ?? item.toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

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
    const routeHistory = useHistory();
    const { type: rawType, id } = useParams();
    const { profile } = useAuth();

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
                    const albumArtists = uniqueById(
                        album.artists?.map((artist) => ({
                            id: artist.id,
                            name: artist.name,
                        })) ?? []
                    );
                    const items = tracks.items.map((track) =>
                        mapTrackItem(track, {
                            albumImage,
                            albumId: album.id,
                        })
                    );

                    if (!active) return;
                    setHeader({
                        id: album.id,
                        mediaType: 'album',
                        title: album.name,
                        subtitle: joinNames(album.artists),
                        artists: albumArtists,
                        imageUrl: albumImage,
                        imageShape: 'square',
                        typeLabel: albumTypeLabel(album),
                        meta: [
                            formatYear(album.release_date),
                            `${album.total_tracks} tracks`,
                        ]
                            .filter(Boolean)
                            .join(' • '),
                        description: album.label,
                        icon: TYPE_ICONS.album,
                        contextUri: album.uri,
                        saveIds: items
                            .map((item) => item.id)
                            .filter((id): id is string => Boolean(id)),
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
                        id: playlist.id,
                        mediaType: 'playlist',
                        title: playlist.name,
                        subtitle: playlist.owner?.display_name,
                        imageUrl: playlist.images?.[0]?.url,
                        imageShape: 'square',
                        typeLabel: TYPE_LABELS.playlist,
                        meta: `${playlist.tracks?.total ?? 0} tracks`,
                        description: playlist.description ?? undefined,
                        icon: TYPE_ICONS.playlist,
                        contextUri: playlist.uri,
                    });
                    setSections([{ title: 'Tracks', items }]);
                }

                if (type === 'track') {
                    const track = await sendSpotifyMessage('getTrack', {
                        id,
                        market,
                    });
                    const albumTracks =
                        track.album?.id &&
                        (await sendSpotifyMessage('getAlbumTracks', {
                            albumId: track.album.id,
                            market,
                            limit: 50,
                        }));
                    const artistTop =
                        track.artists?.[0]?.id &&
                        (await sendSpotifyMessage('getArtistTopTracks', {
                            id: track.artists[0].id!,
                            market,
                        }));

                    const headerArtists = uniqueById(
                        track.artists?.map((artist) => ({
                            id: artist.id,
                            name: artist.name,
                        })) ?? []
                    );

                    if (!active) return;
                    setHeader({
                        id: track.id,
                        mediaType: 'track',
                        title: track.name,
                        subtitle: track.album?.name,
                        artists: headerArtists,
                        album: track.album
                            ? {
                                  id: track.album.id,
                                  name: track.album.name,
                                  imageUrl: track.album.images?.[0]?.url,
                              }
                            : undefined,
                        imageUrl: track.album?.images?.[0]?.url,
                        imageShape: 'square',
                        typeLabel: TYPE_LABELS.track,
                        meta: [
                            formatYear(track.album?.release_date),
                            formatDuration(track.duration_ms),
                        ]
                            .filter(Boolean)
                            .join(' • '),
                        description: track.album?.label ?? undefined,
                        icon: TYPE_ICONS.track,
                        uri: track.uri,
                        contextUri: track.album?.uri,
                        saveIds: track.id ? [track.id] : [],
                    });
                    const nextSections: MediaSection[] = [];

                    if (albumTracks?.items && track.album?.id) {
                        const albumItems = albumTracks.items
                            .map((t) =>
                                mapTrackItem(t, {
                                    albumImage: track.album?.images?.[0]?.url,
                                    albumId: track.album?.id,
                                })
                            )
                            .filter((item): item is MediaItem =>
                                Boolean(item && item.id !== track.id)
                            );
                        const dedupedAlbum = uniqueById(albumItems);
                        if (dedupedAlbum.length) {
                            nextSections.push({
                                title: 'From this album',
                                items: dedupedAlbum,
                            });
                        }
                    }

                    if (artistTop?.tracks?.length) {
                        const artistItems = artistTop.tracks
                            .map((t) => mapTrackItem(t))
                            .filter((item): item is MediaItem =>
                                Boolean(item && item.id !== track.id)
                            );
                        const dedupedArtist = uniqueById(artistItems);
                        if (dedupedArtist.length) {
                            nextSections.push({
                                title: 'Popular from this artist',
                                items: dedupedArtist,
                            });
                        }
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
                        id: artist.id,
                        mediaType: 'artist',
                        title: artist.name,
                        subtitle: artist.genres?.[0],
                        artists: [{ id: artist.id, name: artist.name }],
                        imageUrl: artist.images?.[0]?.url,
                        imageShape: 'round',
                        typeLabel: TYPE_LABELS.artist,
                        meta: artist.followers
                            ? `${artist.followers.total.toLocaleString()} followers`
                            : undefined,
                        description: artist.genres?.slice(0, 3).join(', '),
                        icon: TYPE_ICONS.artist,
                    });
                    setSections([
                        {
                            title: 'Top tracks',
                            items: uniqueById(
                                topTracks.tracks
                                    .map((track) =>
                                        mapTrackItem(track, {
                                            imageUrl: artist.images?.[0]?.url,
                                            artistId: artist.id,
                                        })
                                    )
                                    .filter(Boolean) as MediaItem[]
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
                            limit: 15,
                        }
                    );
                    if (!active) return;
                    setHeader({
                        id: show.id,
                        mediaType: 'show',
                        title: show.name,
                        subtitle: show.publisher,
                        imageUrl: show.images?.[0]?.url,
                        imageShape: 'square',
                        typeLabel: TYPE_LABELS.show,
                        meta: `${show.total_episodes} episodes`,
                        description: show.description,
                        icon: TYPE_ICONS.show,
                    });
                    setSections([
                        {
                            title: 'Episodes',
                            items: (episodes.items ?? [])
                                .map(mapEpisodeItem)
                                .filter(Boolean),
                        },
                    ]);
                }

                if (type === 'episode') {
                    const episode = await sendSpotifyMessage('getEpisode', {
                        id,
                        market,
                    });
                    if (!active) return;
                    setHeader({
                        id: episode.id,
                        mediaType: 'episode',
                        title: episode.name,
                        subtitle: episode.show?.name,
                        imageUrl: episode.images?.[0]?.url,
                        imageShape: 'square',
                        typeLabel: TYPE_LABELS.episode,
                        meta: formatDuration(episode.duration_ms),
                        description: episode.description,
                        icon: TYPE_ICONS.episode,
                        uri: episode.uri,
                        contextUri: episode.show?.uri,
                    });
                    setSections([]);
                }
            } catch (err) {
                if (!active) return;
                setError(
                    err instanceof Error ? err.message : 'Failed to load media.'
                );
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [id, market, type]);

    const playContext = (uri?: string, contextUri?: string) => {
        if (!uri && !contextUri) return;
        void sendSpotifyMessage('startResumePlayback', {
            uris: uri ? [uri] : undefined,
            contextUri,
        });
    };

    const openMedia = (nextType: MediaType, nextId?: string) => {
        if (!nextId) return;
        routeHistory.goTo(`/media/${nextType}/${nextId}`);
    };

    const backgroundStyle = header?.imageUrl
        ? {
              backgroundImage: `linear-gradient(180deg, rgba(5,7,14,0.85), rgba(7,10,18,0.9) 30%, var(--color-panel-solid) 65%), url(${header.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'var(--color-panel-solid)',
          }
        : { backgroundColor: 'var(--color-panel-solid)' };

    return (
        <div
            className="relative min-h-0 overflow-y-auto"
            style={backgroundStyle}
        >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[var(--color-panel-solid)]" />
            <Flex p="3" direction="column" gap="4" className="relative z-10">
                <MediaHero
                    header={header}
                    loading={loading}
                    onPlay={() => playContext(header?.uri, header?.contextUri)}
                    onAddToQueue={() =>
                        header?.uri
                            ? sendSpotifyMessage('addToQueue', header.uri)
                            : undefined
                    }
                    onSave={() =>
                        header?.mediaType === 'track' && header.id
                            ? sendSpotifyMessage('saveTracks', [header.id])
                            : header?.mediaType === 'album' &&
                                header.saveIds?.length
                              ? sendSpotifyMessage('saveTracks', header.saveIds)
                              : undefined
                    }
                    onOpenMedia={openMedia}
                />

                {header?.description && !loading && (
                    <Text size="2" color="gray" className="leading-relaxed">
                        {header.description}
                    </Text>
                )}

                {error && (
                    <Text size="2" color="red">
                        {error}
                    </Text>
                )}

                {loading && !error && <MediaSectionsSkeleton />}

                {!loading &&
                    !error &&
                    sections.map((section) => (
                        <MediaSection
                            key={section.title}
                            section={section}
                            onOpenMedia={openMedia}
                        />
                    ))}
            </Flex>
        </div>
    );
}

function MediaHero({
    header,
    loading,
    onPlay,
    onAddToQueue,
    onSave,
    onOpenMedia,
}: {
    header: MediaHeader | null;
    loading: boolean;
    onPlay: () => void;
    onAddToQueue?: () => void;
    onSave?: () => void;
    onOpenMedia: (type: MediaType, id?: string) => void;
}) {
    if (loading && !header) {
        return (
            <Flex align="center" gap="3" justify="between" className="p-1">
                <Skeleton>
                    <div className="h-20 w-20 rounded-lg" />
                </Skeleton>
                <Flex direction="column" gap="2" className="min-w-0 flex-1">
                    <Skeleton>
                        <div className="h-3 w-16" />
                    </Skeleton>
                    <Skeleton>
                        <div className="h-8 w-64" />
                    </Skeleton>
                    <Skeleton>
                        <div className="h-4 w-40" />
                    </Skeleton>
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex
            align="center"
            gap="3"
            justify="between"
            wrap="wrap"
            className="p-1"
        >
            <Flex align="center" gap="3" className="min-w-0 flex-1">
                <div className="relative">
                    <AvatarButton
                        avatar={{
                            src: header?.imageUrl,
                            fallback: header?.icon ?? <PlayIcon />,
                            radius:
                                header?.imageShape === 'round'
                                    ? 'full'
                                    : 'small',
                            size: '7',
                        }}
                        aria-label={header?.title ?? 'Media artwork'}
                        disabled={loading}
                        className="shadow-lg"
                        onClick={onPlay}
                    >
                        <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/50 opacity-0 transition hover:opacity-100 focus-visible:opacity-100">
                            <PlayIcon />
                        </div>
                    </AvatarButton>
                </div>
                <Flex direction="column" gap="2" className="min-w-0">
                    <Text size="1" color="gray" className="uppercase">
                        {header?.typeLabel ?? 'Media'}
                    </Text>
                    <Marquee mode="bounce">
                        <Text
                            size="5"
                            weight="bold"
                            className="truncate leading-tight"
                        >
                            {header?.title ?? 'Loading...'}
                        </Text>
                    </Marquee>
                    {header?.subtitle && (
                        <Marquee mode="right">
                            <Text
                                size="2"
                                color="gray"
                                className={clsx(
                                    'truncate leading-tight',
                                    header?.album?.id &&
                                        'cursor-pointer underline decoration-dotted hover:decoration-solid'
                                )}
                                role={header?.album?.id ? 'link' : undefined}
                                onClick={() => {
                                    if (header?.album?.id) {
                                        onOpenMedia('album', header.album.id);
                                    }
                                }}
                            >
                                {header.subtitle}
                            </Text>
                        </Marquee>
                    )}
                    {header?.artists && header.artists.length > 0 && (
                        <Flex wrap="wrap" gap="2" className="items-center">
                            {header.artists.map((artist) => (
                                <button
                                    key={artist.id ?? artist.name}
                                    className="text-sm text-[var(--accent-11)] underline decoration-dotted hover:decoration-solid"
                                    onClick={() =>
                                        onOpenMedia('artist', artist.id)
                                    }
                                    disabled={!artist.id}
                                >
                                    {artist.name}
                                </button>
                            ))}
                        </Flex>
                    )}
                    {header?.meta && (
                        <Text size="1" color="gray">
                            {header.meta}
                        </Text>
                    )}
                </Flex>
            </Flex>

            <Flex align="center" gap="2" wrap="wrap" className="self-start">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <IconButton
                            variant="ghost"
                            size="2"
                            aria-label="More options"
                            disabled={loading}
                        >
                            <DotsHorizontalIcon />
                        </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content size="2" variant="soft">
                        <DropdownMenu.Item
                            disabled={
                                loading || (!header?.uri && !header?.contextUri)
                            }
                            onSelect={onPlay}
                        >
                            Play
                        </DropdownMenu.Item>
                        {onAddToQueue && header?.uri && (
                            <DropdownMenu.Item
                                disabled={loading}
                                onSelect={onAddToQueue}
                            >
                                Add to queue
                            </DropdownMenu.Item>
                        )}
                        {onSave && (
                            <DropdownMenu.Item
                                disabled={loading}
                                onSelect={onSave}
                            >
                                Add to playlist
                            </DropdownMenu.Item>
                        )}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </Flex>
        </Flex>
    );
}

function MediaSection({
    section,
    onOpenMedia,
}: {
    section: MediaSection;
    onOpenMedia: (type: MediaType, id?: string) => void;
}) {
    return (
        <Flex direction="column" gap="2">
            <Text size="3" weight="bold">
                {section.title}
            </Text>
            <Flex direction="column" gap="1">
                {section.items.map((item) => (
                    <MediaRow
                        key={item.id}
                        item={item}
                        onOpenMedia={onOpenMedia}
                    />
                ))}
            </Flex>
        </Flex>
    );
}

function MediaRow({
    item,
    onOpenMedia,
}: {
    item: MediaItem;
    onOpenMedia: (type: MediaType, id?: string) => void;
}) {
    const radius = item.imageShape === 'round' ? 'full' : 'small';

    const playContext = (uri?: string, contextUri?: string) => {
        if (!uri && !contextUri) return;
        void sendSpotifyMessage('startResumePlayback', {
            uris: uri ? [uri] : undefined,
            contextUri,
        });
    };

    return (
        <Flex
            align="center"
            gap="2"
            className="rounded-md border border-transparent px-2 py-2 transition-colors hover:border-[var(--gray-a6)] hover:bg-[var(--gray-a2)]"
            role="button"
            tabIndex={0}
            onClick={() => onOpenMedia(item.type, item.id)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenMedia(item.type, item.id);
                }
            }}
        >
            <AvatarButton
                avatar={{
                    src: item.imageUrl,
                    fallback: TYPE_ICONS[item.type],
                    radius,
                    size: '3',
                }}
                aria-label={item.title}
                onClick={() => playContext(item.uri, item.contextUri)}
            />
            <Flex direction="column" gap="1" className="min-w-0 flex-1">
                <Marquee mode="bounce">
                    <Text size="2" weight="medium" className="truncate">
                        {item.title}
                    </Text>
                </Marquee>
                {item.subtitle && (
                    <Marquee mode="right">
                        <Text size="1" color="gray" className="truncate">
                            {item.subtitle}
                        </Text>
                    </Marquee>
                )}
            </Flex>
            <Flex align="center" gap="2" className="flex-none">
                {item.meta && (
                    <Text size="1" color="gray" className="whitespace-nowrap">
                        {item.meta}
                    </Text>
                )}
                <TrackMenu
                    trackUri={item.uri}
                    albumId={item.albumId}
                    artistId={item.artistId}
                    onOpenMedia={(type, id) => onOpenMedia(type, id)}
                />
            </Flex>
        </Flex>
    );
}

function MediaSectionsSkeleton() {
    return (
        <Flex direction="column" gap="3">
            <Skeleton>
                <div className="h-5 w-32" />
            </Skeleton>
            <Flex direction="column" gap="2">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index}>
                        <div className="h-10 w-full rounded-md" />
                    </Skeleton>
                ))}
            </Flex>
        </Flex>
    );
}

function mapTrackItem(
    track?: SimplifiedTrack | Track | null,
    options?: {
        imageUrl?: string;
        albumImage?: string;
        albumId?: string;
        artistId?: string;
    }
): MediaItem | null {
    if (!track) return null;
    return {
        id: track.id,
        type: 'track',
        title: track.name,
        subtitle: joinNames(track.artists),
        meta: formatDuration(track.duration_ms),
        imageUrl:
            track.album?.images?.[0]?.url ??
            options?.albumImage ??
            options?.imageUrl,
        imageShape: 'square',
        uri: track.uri,
        contextUri: track.album?.uri,
        albumId: track.album?.id ?? options?.albumId,
        artistId: options?.artistId ?? track.artists?.[0]?.id,
    };
}

function mapPlaylistItem(
    track?: SimplifiedTrack | Track | null
): MediaItem | null {
    if (!track) return null;
    return {
        id: track.id,
        type: 'track',
        title: track.name,
        subtitle: joinNames(track.artists),
        meta: formatDuration(track.duration_ms),
        imageUrl: track.album?.images?.[0]?.url,
        imageShape: 'square',
        uri: track.uri,
        contextUri: track.album?.uri,
        albumId: track.album?.id,
        artistId: track.artists?.[0]?.id,
    };
}

function mapEpisodeItem(
    episode?: SimplifiedEpisode | Episode | null
): MediaItem | null {
    if (!episode) return null;
    return {
        id: episode.id,
        type: 'episode',
        title: episode.name,
        subtitle: episode.show?.name,
        meta: formatDuration(episode.duration_ms),
        imageUrl: episode.images?.[0]?.url,
        imageShape: 'square',
        uri: episode.uri,
        contextUri: episode.show?.uri,
    };
}
