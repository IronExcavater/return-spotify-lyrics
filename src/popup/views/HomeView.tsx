import {
    DiscIcon,
    MixerHorizontalIcon,
    PersonIcon,
    StackIcon,
} from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';
import { sendSpotifyMessage } from '../../shared/messaging';
import { HomeSection } from '../components/HomeSection';
import { HomeShelf } from '../components/HomeShelf';
import { MediaCard } from '../components/MediaCard';
import { TrackMenu } from '../components/TrackMenu';
import { useRouteHistory } from '../hooks/useRouteHistory';
import { useSpotifyHome } from '../hooks/useSpotifyHome';
import {
    SearchFilters as Filters,
    SearchType,
    useSpotifySearch,
} from '../hooks/useSpotifySearch';

interface Props {
    searchQuery: string;
    types: SearchType[];
    filters: Filters;
}

export function HomeView({ searchQuery, types, filters }: Props) {
    const routeHistory = useRouteHistory();
    const trimmed = searchQuery.trim();
    const {
        recents,
        playlists,
        madeForYou,
        madeForYouMessage,
        loading,
        error,
    } = useSpotifyHome();

    const filterActive = Object.values(filters).some((value) => value?.trim());
    const hasSearch = trimmed.length > 0 || filterActive;

    const {
        results,
        loading: searching,
        error: searchError,
    } = useSpotifySearch(trimmed, types, filters);

    const trackItems = (results?.tracks?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const artistItems = (results?.artists?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const albumItems = (results?.albums?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const playlistItems = (results?.playlists?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const showItems = (results?.shows?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );
    const episodeItems = (results?.episodes?.items ?? []).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
    );

    const showTracks = types.includes('track');
    const showArtists = types.includes('artist');
    const showAlbums = types.includes('album');
    const showPlaylists = types.includes('playlist');
    const showShows = types.includes('show');
    const showEpisodes = types.includes('episode');

    const totalMatches =
        trackItems.length +
        artistItems.length +
        albumItems.length +
        playlistItems.length +
        showItems.length +
        episodeItems.length;

    const openMedia = (type: string, id?: string | null) => {
        if (!id) return;
        routeHistory.goTo(`/media/${type}/${id}`);
    };

    const openMediaFromMenu = (type: 'album' | 'artist', id: string) => {
        openMedia(type, id);
    };

    const playContext = (contextUri?: string, uri?: string) => {
        if (uri) {
            void sendSpotifyMessage('startResumePlayback', { uris: [uri] });
        } else if (contextUri) {
            void sendSpotifyMessage('startResumePlayback', {
                contextUri,
            });
        }
    };

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="min-h-0 overflow-y-auto"
        >
            <Flex m="3" direction="column" gap="4">
                {hasSearch ? (
                    <HomeSection
                        title="Search"
                        subtitle={
                            searchError
                                ? 'Search failed.'
                                : searching
                                  ? 'Searching Spotify...'
                                  : undefined
                        }
                    >
                        <Flex direction="column" gap="3">
                            {searching && (
                                <Text size="2" color="gray">
                                    Gathering results...
                                </Text>
                            )}

                            {!searching && showTracks && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Tracks
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {trackItems.length > 0 ? (
                                            trackItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.artists
                                                        ?.map(
                                                            (artist) =>
                                                                artist?.name
                                                        )
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                    meta={item.album?.name}
                                                    imageUrl={
                                                        item.album?.images?.[0]
                                                            ?.url
                                                    }
                                                    variant="row"
                                                    icon={<DiscIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'track',
                                                            item.id
                                                        )
                                                    }
                                                    action={
                                                        <TrackMenu
                                                            trackUri={item.uri}
                                                            albumId={
                                                                item.album?.id
                                                            }
                                                            artistId={
                                                                item
                                                                    .artists?.[0]
                                                                    ?.id
                                                            }
                                                            onOpenMedia={
                                                                openMediaFromMenu
                                                            }
                                                        />
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No tracks found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching && showArtists && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Artists
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {artistItems.length > 0 ? (
                                            artistItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.genres?.[0]}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    variant="row"
                                                    imageShape="round"
                                                    icon={<PersonIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'artist',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No artists found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching && showAlbums && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Albums
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {albumItems.length > 0 ? (
                                            albumItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.artists
                                                        ?.map(
                                                            (artist) =>
                                                                artist?.name
                                                        )
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                    meta={item.release_date?.slice(
                                                        0,
                                                        4
                                                    )}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    variant="row"
                                                    icon={<DiscIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'album',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No albums found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching && showPlaylists && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Playlists
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {playlistItems.length > 0 ? (
                                            playlistItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={
                                                        item.owner?.display_name
                                                    }
                                                    meta={`${item.tracks?.total ?? 0} tracks`}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    variant="row"
                                                    icon={<StackIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'playlist',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No playlists found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching && showShows && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Shows
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {showItems.length > 0 ? (
                                            showItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.publisher}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    variant="row"
                                                    icon={
                                                        <MixerHorizontalIcon />
                                                    }
                                                    onClick={() =>
                                                        openMedia(
                                                            'show',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No shows found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching && showEpisodes && (
                                <Flex direction="column" gap="2">
                                    <Text size="3" weight="bold">
                                        Episodes
                                    </Text>
                                    <Flex direction="column" gap="2">
                                        {episodeItems.length > 0 ? (
                                            episodeItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.show?.name}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    variant="row"
                                                    icon={
                                                        <MixerHorizontalIcon />
                                                    }
                                                    onClick={() =>
                                                        openMedia(
                                                            'episode',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <Text size="2" color="gray">
                                                No episodes found.
                                            </Text>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {!searching &&
                                totalMatches === 0 &&
                                !searchError && (
                                    <Text size="2" color="gray">
                                        No results yet. Try another query or
                                        filter.
                                    </Text>
                                )}

                            {searchError && (
                                <Text size="2" color="red">
                                    {searchError}
                                </Text>
                            )}
                        </Flex>
                    </HomeSection>
                ) : (
                    <>
                        <HomeSection title="Recents" subtitle="Recently played">
                            {loading && recents.length === 0 ? (
                                <Text size="2" color="gray">
                                    Loading recents...
                                </Text>
                            ) : recents.length === 0 ? (
                                <Text size="2" color="gray">
                                    Nothing played recently.
                                </Text>
                            ) : (
                                <HomeShelf>
                                    {recents.map((item) => (
                                        <MediaCard
                                            key={`${item.track.id}-${item.played_at}`}
                                            title={item.track.name}
                                            subtitle={item.track.artists
                                                ?.map((artist) => artist?.name)
                                                .filter(Boolean)
                                                .join(', ')}
                                            imageUrl={
                                                item.track.album?.images?.[0]
                                                    ?.url
                                            }
                                            icon={<DiscIcon />}
                                            onClick={() =>
                                                openMedia(
                                                    'track',
                                                    item.track.id
                                                )
                                            }
                                            onPlay={() =>
                                                playContext(
                                                    undefined,
                                                    item.track.uri
                                                )
                                            }
                                        />
                                    ))}
                                </HomeShelf>
                            )}
                        </HomeSection>

                        <HomeSection
                            title="Playlists"
                            subtitle="Your collections"
                        >
                            {loading && playlists.length === 0 ? (
                                <Text size="2" color="gray">
                                    Loading playlists...
                                </Text>
                            ) : playlists.length === 0 ? (
                                <Text size="2" color="gray">
                                    No playlists found.
                                </Text>
                            ) : (
                                <HomeShelf>
                                    {playlists.map((playlist) => (
                                        <MediaCard
                                            key={playlist.id}
                                            title={playlist.name}
                                            subtitle={
                                                playlist.owner?.display_name
                                            }
                                            meta={`${playlist.tracks?.total ?? 0} tracks`}
                                            imageUrl={playlist.images?.[0]?.url}
                                            icon={<StackIcon />}
                                            onClick={() =>
                                                openMedia(
                                                    'playlist',
                                                    playlist.id
                                                )
                                            }
                                            onPlay={() =>
                                                playContext(playlist.uri)
                                            }
                                        />
                                    ))}
                                </HomeShelf>
                            )}
                        </HomeSection>

                        <HomeSection
                            title="Made for you"
                            subtitle={
                                madeForYouMessage ??
                                'Personalized playlists and mixes'
                            }
                        >
                            {loading && madeForYou.length === 0 ? (
                                <Text size="2" color="gray">
                                    Loading personalized playlists...
                                </Text>
                            ) : madeForYou.length === 0 ? (
                                <Text size="2" color="gray">
                                    No personalized playlists yet.
                                </Text>
                            ) : (
                                <HomeShelf>
                                    {madeForYou.map((playlist) => (
                                        <MediaCard
                                            key={playlist.id}
                                            title={playlist.name}
                                            subtitle={
                                                playlist.owner?.display_name
                                            }
                                            meta={`${playlist.tracks?.total ?? 0} tracks`}
                                            imageUrl={playlist.images?.[0]?.url}
                                            icon={<StackIcon />}
                                            onClick={() =>
                                                openMedia(
                                                    'playlist',
                                                    playlist.id
                                                )
                                            }
                                            onPlay={() =>
                                                playContext(playlist.uri)
                                            }
                                        />
                                    ))}
                                </HomeShelf>
                            )}
                        </HomeSection>

                        {error && (
                            <Text size="2" color="red">
                                {error}
                            </Text>
                        )}
                    </>
                )}
            </Flex>
        </Flex>
    );
}
