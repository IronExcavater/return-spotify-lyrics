import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from '@hello-pangea/dnd';
import { PlusIcon } from '@radix-ui/react-icons';
import {
    Flex,
    Text,
    Switch,
    Button,
    IconButton,
    AlertDialog,
    DropdownMenu,
} from '@radix-ui/themes';
import type {
    Artist,
    ItemTypes,
    SearchResults,
    SimplifiedAlbum,
    SimplifiedArtist,
    SimplifiedPlaylist,
    Track,
} from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';

import { sendSpotifyMessage } from '../../shared/messaging';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import type { MediaShelfItem } from '../components/MediaShelf';
import { usePersonalisation } from '../hooks/usePersonalisation';
import type { SearchFilter } from '../hooks/useSearch';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

type SearchType = 'track' | 'album' | 'artist' | 'playlist';

type SearchContext = {
    active: boolean;
    query: string;
    types: SearchType[];
};

type PlaylistLike = Pick<
    SimplifiedPlaylist,
    'id' | 'uri' | 'name' | 'owner' | 'images'
>;

const DEFAULT_SEARCH_TYPES: SearchType[] = [
    'track',
    'album',
    'artist',
    'playlist',
];

const buildHomeSections = (): MediaSectionState[] => [
    {
        id: 'recent',
        title: 'Recently played',
        subtitle: 'Back in the rotation',
        variant: 'list',
        orientation: 'horizontal',
        itemsPerColumn: 3,
        maxVisible: 4,
        fixedHeight: 220,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'top-tracks',
        title: 'Top tracks',
        subtitle: 'Your short-term replay list',
        variant: 'list',
        orientation: 'vertical',
        itemsPerColumn: 6,
        maxVisible: 8,
        fixedHeight: 320,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'top-artists',
        title: 'Top artists',
        subtitle: 'Creators you gravitate to',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'new-releases',
        title: 'New releases',
        subtitle: 'Latest drops',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'featured-playlists',
        title: 'Featured playlists',
        subtitle: 'Freshly curated',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'saved-tracks',
        title: 'Saved tracks',
        subtitle: 'Your likes, right here',
        variant: 'list',
        orientation: 'vertical',
        itemsPerColumn: 6,
        maxVisible: 8,
        fixedHeight: 320,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
];

const SEARCH_SECTION_BASE: Record<SearchType, MediaSectionState> = {
    track: {
        id: 'search-tracks',
        title: 'Tracks',
        subtitle: 'Search results',
        variant: 'list',
        orientation: 'vertical',
        itemsPerColumn: 6,
        maxVisible: 10,
        fixedHeight: 360,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    album: {
        id: 'search-albums',
        title: 'Albums',
        subtitle: 'Search results',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    artist: {
        id: 'search-artists',
        title: 'Artists',
        subtitle: 'Search results',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    playlist: {
        id: 'search-playlists',
        title: 'Playlists',
        subtitle: 'Search results',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 5,
        fixedHeight: 240,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
};

const buildSearchSections = (types: SearchType[]): MediaSectionState[] =>
    types.map((type) => ({ ...SEARCH_SECTION_BASE[type], items: [] }));

const getImageUrl = (images?: { url: string }[]) => images?.[0]?.url;

const formatArtists = (artists?: SimplifiedArtist[]) =>
    artists?.map((artist) => artist.name).join(', ');

const trackToItem = (track: Track): MediaShelfItem => ({
    id: track.id ?? track.uri ?? track.name,
    title: track.name,
    subtitle: formatArtists(track.artists),
    imageUrl: getImageUrl(track.album?.images),
});

const albumToItem = (album: SimplifiedAlbum): MediaShelfItem => ({
    id: album.id ?? album.uri ?? album.name,
    title: album.name,
    subtitle: formatArtists(album.artists),
    imageUrl: getImageUrl(album.images),
});

const playlistToItem = (playlist: PlaylistLike): MediaShelfItem => ({
    id: playlist.id ?? playlist.uri ?? playlist.name,
    title: playlist.name,
    subtitle: playlist.owner?.display_name
        ? `By ${playlist.owner.display_name}`
        : undefined,
    imageUrl: getImageUrl(playlist.images),
});

const artistToItem = (artist: SimplifiedArtist | Artist): MediaShelfItem => {
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

const topArtistToItem = (artist: Artist): MediaShelfItem => ({
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

const toYear = (iso?: string) => {
    if (!iso) return undefined;
    const year = Number(iso.slice(0, 4));
    return Number.isFinite(year) ? year : undefined;
};

const buildSearchContext = (
    searchQuery: string,
    filters: SearchFilter[]
): SearchContext => {
    const trimmedQuery = searchQuery.trim();
    const parts = new Set<string>();
    const types: SearchType[] = [];

    if (trimmedQuery) parts.add(trimmedQuery);

    filters.forEach((filter) => {
        if (filter.kind === 'artist' && filter.value.type === 'text') {
            const raw = filter.value.value.trim();
            if (!raw) return;
            const safe = raw.replace(/"/g, '');
            parts.add(`artist:"${safe}"`);
            if (!trimmedQuery.includes(raw)) parts.add(raw);
        }

        if (filter.kind === 'genre' && filter.value.type === 'text') {
            const raw = filter.value.value.trim();
            if (!raw) return;
            const safe = raw.replace(/"/g, '');
            parts.add(`genre:"${safe}"`);
            if (!trimmedQuery.includes(raw)) parts.add(raw);
        }

        if (filter.kind === 'category' && filter.value.type === 'options') {
            filter.value.value.forEach((value) => {
                const key = value.trim().toLowerCase();
                if (
                    key === 'track' ||
                    key === 'album' ||
                    key === 'artist' ||
                    key === 'playlist'
                ) {
                    types.push(key as SearchType);
                }
                if (key === 'show') types.push('playlist');
                if (key === 'episode') types.push('track');
                if (key === 'audiobook') types.push('album');
            });
        }

        if (filter.kind === 'year' && filter.value.type === 'date') {
            const year = toYear(filter.value.value);
            if (year) parts.add(`year:${year}`);
        }
    });

    const query = Array.from(parts).join(' ').trim();
    const resolvedTypes = types.length
        ? Array.from(new Set(types))
        : DEFAULT_SEARCH_TYPES;

    return {
        active: query.length > 0,
        query,
        types: resolvedTypes,
    };
};

export function HomeView({ searchQuery, filters }: Props) {
    const [homeSections, setHomeSections] = useState<MediaSectionState[]>(() =>
        buildHomeSections()
    );
    const [searchSections, setSearchSections] = useState<MediaSectionState[]>(
        () => buildSearchSections(DEFAULT_SEARCH_TYPES)
    );
    const [editing, setEditing] = useState(false);
    const [homeLoading, setHomeLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [homeRefreshKey, setHomeRefreshKey] = useState(0);
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const homeItemsRef = useRef<Record<string, MediaShelfItem[]>>({});

    const { heading } = usePersonalisation({ searchQuery, filters });

    const searchContext = useMemo(
        () => buildSearchContext(searchQuery, filters),
        [filters, searchQuery]
    );

    const isSearching = searchContext.active;
    const activeSections = isSearching ? searchSections : homeSections;
    const isLoading = isSearching ? searchLoading : homeLoading;

    const setActiveSections = useCallback(
        (updater: (prev: MediaSectionState[]) => MediaSectionState[]) => {
            if (isSearching) setSearchSections(updater);
            else setHomeSections(updater);
        },
        [isSearching]
    );

    const resetSections = useCallback(() => {
        if (isSearching) {
            setSearchSections(buildSearchSections(searchContext.types));
        } else {
            setHomeSections(buildHomeSections());
            setHomeRefreshKey((value) => value + 1);
        }
    }, [isSearching, searchContext.types]);

    const updateSection = useCallback(
        (id: string, patch: Partial<MediaSectionState>) => {
            setActiveSections((prev) =>
                prev.map((section) =>
                    section.id === id ? { ...section, ...patch } : section
                )
            );
        },
        [setActiveSections]
    );

    const updateItems = useCallback(
        (id: string, next: MediaShelfItem[]) => {
            setActiveSections((prev) =>
                prev.map((section) =>
                    section.id === id ? { ...section, items: next } : section
                )
            );
        },
        [setActiveSections]
    );

    const removeSection = useCallback(
        (id: string) => {
            setActiveSections((prev) =>
                prev.filter((section) => section.id !== id)
            );
        },
        [setActiveSections]
    );

    const availableHomeSections = useMemo(() => {
        if (isSearching) return [];
        const existing = new Set(homeSections.map((section) => section.id));
        return buildHomeSections().filter(
            (section) => !existing.has(section.id)
        );
    }, [homeSections, isSearching]);

    const addSection = useCallback(
        (id: string) => {
            if (isSearching) return;
            const template = buildHomeSections().find(
                (section) => section.id === id
            );
            if (!template) return;
            const cachedItems = homeItemsRef.current[id];
            const nextSection = {
                ...template,
                items: cachedItems ?? template.items,
            };
            setHomeSections((prev) => [...prev, nextSection]);
            setLastAddedId(id);
        },
        [isSearching]
    );

    const onSectionDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;
            const next = [...activeSections];
            const [moved] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, moved);
            setActiveSections(() => next);
        },
        [activeSections, setActiveSections]
    );

    useEffect(() => {
        if (!lastAddedId) return;

        const raf = requestAnimationFrame(() => {
            const node = sectionRefs.current.get(lastAddedId);
            if (node) {
                node.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setLastAddedId(null);
            }
        });

        return () => cancelAnimationFrame(raf);
    }, [lastAddedId]);

    useEffect(() => {
        if (isSearching) return;
        let cancelled = false;

        const load = async () => {
            setHomeLoading(true);
            const [
                recentlyPlayed,
                topTracks,
                topArtists,
                newReleases,
                featured,
                saved,
            ] = await Promise.allSettled([
                sendSpotifyMessage('getRecentlyPlayedTracks', {
                    limit: 20,
                }),
                sendSpotifyMessage('getTopTracks', {
                    limit: 20,
                    timeRange: 'short_term',
                }),
                sendSpotifyMessage('getTopArtists', {
                    limit: 20,
                    timeRange: 'short_term',
                }),
                sendSpotifyMessage('getNewReleases', { limit: 20 }),
                sendSpotifyMessage('getFeaturedPlaylists', { limit: 20 }),
                sendSpotifyMessage('getSavedTracks', { limit: 20 }),
            ]);

            if (cancelled) return;

            const itemsBySection: Record<string, MediaShelfItem[]> = {
                recent:
                    recentlyPlayed.status === 'fulfilled'
                        ? recentlyPlayed.value.items.map((entry) =>
                              trackToItem(entry.track)
                          )
                        : [],
                'top-tracks':
                    topTracks.status === 'fulfilled'
                        ? topTracks.value.items.map((track) =>
                              trackToItem(track)
                          )
                        : [],
                'top-artists':
                    topArtists.status === 'fulfilled'
                        ? topArtists.value.items.map((artist) =>
                              topArtistToItem(artist)
                          )
                        : [],
                'new-releases':
                    newReleases.status === 'fulfilled'
                        ? newReleases.value.albums.items.map((album) =>
                              albumToItem(album)
                          )
                        : [],
                'featured-playlists':
                    featured.status === 'fulfilled'
                        ? featured.value.playlists.items.map((playlist) =>
                              playlistToItem(playlist)
                          )
                        : [],
                'saved-tracks':
                    saved.status === 'fulfilled'
                        ? saved.value.items.map((entry) =>
                              trackToItem(entry.track)
                          )
                        : [],
            };

            homeItemsRef.current = itemsBySection;
            setHomeSections((prev) =>
                prev.map((section) => {
                    const items = itemsBySection[section.id];
                    if (!items) return section;
                    return {
                        ...section,
                        items,
                        hasMore: false,
                        loadingMore: false,
                    };
                })
            );
            setHomeLoading(false);
        };

        void load();

        return () => {
            cancelled = true;
            setHomeLoading(false);
        };
    }, [homeRefreshKey, isSearching]);

    useEffect(() => {
        if (!isSearching) {
            setSearchLoading(false);
            return;
        }
        if (!searchContext.query) {
            setSearchLoading(false);
            return;
        }
        let cancelled = false;

        setSearchLoading(true);
        setSearchSections(buildSearchSections(searchContext.types));

        const load = async () => {
            try {
                const result = (await sendSpotifyMessage('search', {
                    query: searchContext.query,
                    types: searchContext.types as ItemTypes[],
                    limit: 20,
                })) as SearchResults<['track', 'album', 'artist', 'playlist']>;

                if (cancelled) return;

                const itemsByType: Record<SearchType, MediaShelfItem[]> = {
                    track:
                        result.tracks?.items.map((track) =>
                            trackToItem(track)
                        ) ?? [],
                    album:
                        result.albums?.items.map((album) =>
                            albumToItem(album)
                        ) ?? [],
                    artist:
                        result.artists?.items.map((artist) =>
                            artistToItem(artist)
                        ) ?? [],
                    playlist:
                        result.playlists?.items.map((playlist) =>
                            playlistToItem(playlist)
                        ) ?? [],
                };

                setSearchSections((prev) =>
                    prev.map((section) => {
                        const type = (
                            Object.keys(SEARCH_SECTION_BASE) as SearchType[]
                        ).find(
                            (key) => SEARCH_SECTION_BASE[key].id === section.id
                        );
                        if (!type) return section;
                        return {
                            ...section,
                            items: itemsByType[type],
                            hasMore: false,
                            loadingMore: false,
                        };
                    })
                );
                setSearchLoading(false);
            } catch (error) {
                if (!cancelled) {
                    console.warn('[home] Search failed', error);
                    setSearchLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
            setSearchLoading(false);
        };
    }, [isSearching, searchContext.query, searchContext.types]);

    const visibleSections = useMemo(
        () =>
            editing || isLoading
                ? activeSections
                : activeSections.filter((section) => section.items.length > 0),
        [activeSections, editing, isLoading]
    );

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="no-overflow-anchor min-h-0 min-w-0 overflow-y-auto"
        >
            <Flex px="3" py="2" direction="column" gap="1" className="min-w-0">
                <Flex
                    justify="between"
                    direction="column"
                    className={clsx(
                        'relative min-w-0 py-1',
                        editing &&
                            'sticky top-0 z-20 mb-4 bg-[var(--color-background)]'
                    )}
                    mx="-3"
                    px="3"
                >
                    <Flex>
                        {!editing && (
                            <Text size="3" weight="bold">
                                {heading.title}
                            </Text>
                        )}

                        {editing && (
                            <Flex align="center" gap="2" className="relative">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <IconButton
                                            size="1"
                                            variant="soft"
                                            color="green"
                                            radius="full"
                                            aria-label="Add section"
                                            disabled={
                                                availableHomeSections.length ===
                                                0
                                            }
                                        >
                                            <PlusIcon />
                                        </IconButton>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content size="1">
                                        {availableHomeSections.length === 0 && (
                                            <DropdownMenu.Item disabled>
                                                All sections added
                                            </DropdownMenu.Item>
                                        )}
                                        {availableHomeSections.map(
                                            (section) => (
                                                <DropdownMenu.Item
                                                    key={section.id}
                                                    onSelect={() =>
                                                        addSection(section.id)
                                                    }
                                                >
                                                    {section.title}
                                                </DropdownMenu.Item>
                                            )
                                        )}
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>

                                <AlertDialog.Root>
                                    <AlertDialog.Trigger>
                                        <Button
                                            size="1"
                                            variant="soft"
                                            color="red"
                                        >
                                            Restore
                                        </Button>
                                    </AlertDialog.Trigger>
                                    <AlertDialog.Content
                                        maxWidth="260px"
                                        size="1"
                                    >
                                        <AlertDialog.Title size="3">
                                            Revert home layout?
                                        </AlertDialog.Title>
                                        <AlertDialog.Description size="2">
                                            Restore the default shelves.
                                        </AlertDialog.Description>
                                        <Flex mt="3" justify="end" gap="2">
                                            <AlertDialog.Cancel>
                                                <Button variant="soft" size="1">
                                                    Cancel
                                                </Button>
                                            </AlertDialog.Cancel>
                                            <AlertDialog.Action>
                                                <Button
                                                    variant="soft"
                                                    color="red"
                                                    size="1"
                                                    onClick={resetSections}
                                                    autoFocus
                                                >
                                                    Revert
                                                </Button>
                                            </AlertDialog.Action>
                                        </Flex>
                                    </AlertDialog.Content>
                                </AlertDialog.Root>
                            </Flex>
                        )}

                        <Flex align="center" gap="1" ml="auto">
                            <Text size="1" color="gray">
                                Edit
                            </Text>
                            <Switch
                                size="1"
                                checked={editing}
                                onCheckedChange={setEditing}
                                aria-label="Toggle customise mode"
                            />
                        </Flex>

                        {editing && (
                            <div className="pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                        )}
                    </Flex>

                    {!editing && (
                        <Text size="1" color="gray">
                            {heading.subtitle}
                        </Text>
                    )}
                </Flex>

                <DragDropContext onDragEnd={onSectionDragEnd}>
                    <Droppable
                        droppableId="home-sections"
                        direction="vertical"
                        isDropDisabled={!editing}
                    >
                        {(dropProvided) => (
                            <Flex
                                direction="column"
                                className="min-w-0"
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                            >
                                {visibleSections.map((section, index) => (
                                    <Draggable
                                        key={section.id}
                                        draggableId={section.id}
                                        index={index}
                                        isDragDisabled={!editing}
                                    >
                                        {(dragProvided, dragSnapshot) => (
                                            <div
                                                ref={(node) => {
                                                    dragProvided.innerRef(node);
                                                    if (node)
                                                        sectionRefs.current.set(
                                                            section.id,
                                                            node
                                                        );
                                                    else
                                                        sectionRefs.current.delete(
                                                            section.id
                                                        );
                                                }}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                style={{
                                                    ...dragProvided
                                                        .draggableProps.style,
                                                }}
                                            >
                                                <MediaSection
                                                    section={section}
                                                    editing={editing}
                                                    preview={isLoading}
                                                    dragging={
                                                        dragSnapshot.isDragging
                                                    }
                                                    onChange={updateSection}
                                                    onDelete={removeSection}
                                                    onReorderItems={updateItems}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {dropProvided.placeholder}
                            </Flex>
                        )}
                    </Droppable>
                </DragDropContext>
            </Flex>
        </Flex>
    );
}
