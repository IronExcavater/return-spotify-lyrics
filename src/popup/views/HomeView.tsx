import {
    DiscIcon,
    MixerHorizontalIcon,
    PersonIcon,
    StackIcon,
} from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';
import { HomeSection } from '../components/HomeSection';
import { MediaCard } from '../components/MediaCard';
import { MediaShelf } from '../components/MediaShelf';
import { useHistory } from '../hooks/useHistory';
import { useHome } from '../hooks/useHome';
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
    const routeHistory = useHistory();
    const trimmed = searchQuery.trim();
    const {
        recents,
        playlists,
        madeForYou,
        madeForYouMessage,
        recentsFailed,
        playlistsFailed,
        madeForYouFailed,
        loading,
        error,
    } = useHome();

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

    const recentItems = recents.filter((item) => item?.track);
    const playlistsShelf = playlists.filter((item) => item?.id);
    const madeForYouShelf = madeForYou.filter((item) => item?.id);
    const allShelvesFailed =
        recentsFailed && playlistsFailed && madeForYouFailed;

    const openMedia = (type: string, id?: string | null) => {
        if (!id) return;
        routeHistory.goTo(`/media/${type}/${id}`);
    };

    const openMediaFromMenu = (type: 'album' | 'artist', id: string) => {
        openMedia(type, id);
    };

    const recentLoading = loading && recentItems.length === 0;
    const playlistsLoading = loading && playlistsShelf.length === 0;
    const madeForYouLoading = loading && madeForYouShelf.length === 0;

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="min-h-0 overflow-y-auto"
        >
            <Flex m="3" direction="column" gap="4">
                {hasSearch ? (
                    <Flex direction="column" gap="3">
                        {searching && (
                            <>
                                <Text size="2" color="gray">
                                    Searching Spotify...
                                </Text>
                                {[
                                    'Tracks',
                                    'Artists',
                                    'Albums',
                                    'Playlists',
                                ].map((title) => (
                                    <HomeSection key={title} title={title}>
                                        <MediaShelf loading loadingCount={8} />
                                    </HomeSection>
                                ))}
                            </>
                        )}

                        {!searching && (
                            <Flex direction="column" gap="3">
                                {trackItems.length > 0 && (
                                    <HomeSection title="Tracks">
                                        <MediaShelf>
                                            {trackItems.map((item) => (
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
                                                    imageUrl={
                                                        item.album?.images?.[0]
                                                            ?.url
                                                    }
                                                    icon={<DiscIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'track',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {artistItems.length > 0 && (
                                    <HomeSection title="Artists">
                                        <MediaShelf>
                                            {artistItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.genres?.[0]}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    imageShape="round"
                                                    icon={<PersonIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'artist',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {albumItems.length > 0 && (
                                    <HomeSection title="Albums">
                                        <MediaShelf>
                                            {albumItems.map((item) => (
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
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    icon={<DiscIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'album',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {playlistItems.length > 0 && (
                                    <HomeSection title="Playlists">
                                        <MediaShelf>
                                            {playlistItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={
                                                        item.owner?.display_name
                                                    }
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
                                                    icon={<StackIcon />}
                                                    onClick={() =>
                                                        openMedia(
                                                            'playlist',
                                                            item.id
                                                        )
                                                    }
                                                />
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {showItems.length > 0 && (
                                    <HomeSection title="Shows">
                                        <MediaShelf>
                                            {showItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.publisher}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
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
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {episodeItems.length > 0 && (
                                    <HomeSection title="Episodes">
                                        <MediaShelf>
                                            {episodeItems.map((item) => (
                                                <MediaCard
                                                    key={item.id}
                                                    title={item.name}
                                                    subtitle={item.show?.name}
                                                    imageUrl={
                                                        item.images?.[0]?.url
                                                    }
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
                                            ))}
                                        </MediaShelf>
                                    </HomeSection>
                                )}

                                {!searchError &&
                                    trackItems.length === 0 &&
                                    artistItems.length === 0 &&
                                    albumItems.length === 0 &&
                                    playlistItems.length === 0 &&
                                    showItems.length === 0 &&
                                    episodeItems.length === 0 && (
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
                        )}
                    </Flex>
                ) : (
                    <>
                        {!recentsFailed && (
                            <HomeSection
                                title="Recently played"
                                subtitle="Fresh from your history"
                            >
                                {recentItems.length === 0 && !loading ? (
                                    <Text size="2" color="gray">
                                        Nothing played recently.
                                    </Text>
                                ) : (
                                    <MediaShelf loading={recentLoading}>
                                        {recentItems.map((item) => (
                                            <MediaCard
                                                key={`${item.track.id}-${item.played_at}`}
                                                title={item.track.name}
                                                subtitle={item.track.artists
                                                    ?.map(
                                                        (artist) => artist?.name
                                                    )
                                                    .filter(Boolean)
                                                    .join(', ')}
                                                imageUrl={
                                                    item.track.album
                                                        ?.images?.[0]?.url
                                                }
                                                icon={<DiscIcon />}
                                                onClick={() =>
                                                    openMedia(
                                                        'track',
                                                        item.track.id
                                                    )
                                                }
                                            />
                                        ))}
                                    </MediaShelf>
                                )}
                            </HomeSection>
                        )}

                        {!playlistsFailed && (
                            <HomeSection
                                title="Your playlists"
                                subtitle="Saved and created"
                            >
                                {playlistsShelf.length === 0 && !loading ? (
                                    <Text size="2" color="gray">
                                        No playlists found.
                                    </Text>
                                ) : (
                                    <MediaShelf loading={playlistsLoading}>
                                        {playlistsShelf.map((playlist) => (
                                            <MediaCard
                                                key={playlist.id}
                                                title={playlist.name}
                                                subtitle={
                                                    playlist.owner?.display_name
                                                }
                                                imageUrl={
                                                    playlist.images?.[0]?.url
                                                }
                                                icon={<StackIcon />}
                                                onClick={() =>
                                                    openMedia(
                                                        'playlist',
                                                        playlist.id
                                                    )
                                                }
                                            />
                                        ))}
                                    </MediaShelf>
                                )}
                            </HomeSection>
                        )}

                        {!madeForYouFailed && (
                            <HomeSection
                                title="Made for you"
                                subtitle={
                                    madeForYouMessage ??
                                    'Personalized playlists and mixes'
                                }
                            >
                                {madeForYouShelf.length === 0 && !loading ? (
                                    <Text size="2" color="gray">
                                        No personalized playlists yet.
                                    </Text>
                                ) : (
                                    <MediaShelf loading={madeForYouLoading}>
                                        {madeForYouShelf.map((playlist) => (
                                            <MediaCard
                                                key={playlist.id}
                                                title={playlist.name}
                                                subtitle={
                                                    playlist.owner?.display_name
                                                }
                                                imageUrl={
                                                    playlist.images?.[0]?.url
                                                }
                                                icon={<StackIcon />}
                                                onClick={() =>
                                                    openMedia(
                                                        'playlist',
                                                        playlist.id
                                                    )
                                                }
                                            />
                                        ))}
                                    </MediaShelf>
                                )}
                            </HomeSection>
                        )}

                        {error && allShelvesFailed && (
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
