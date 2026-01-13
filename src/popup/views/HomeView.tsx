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
    Skeleton,
} from '@radix-ui/themes';
import type {
    ItemTypes,
    SearchResults,
    SimplifiedPlaylist,
} from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';

import { resolveLocale } from '../../shared/date';
import {
    albumToItem,
    artistToItem,
    audiobookToItem,
    episodeToItem,
    playlistToItem,
    showToItem,
    topArtistToItem,
    trackToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import {
    DEFAULT_SEARCH_TYPES,
    SEARCH_LIMIT,
    buildSearchContext,
    type SearchType,
} from '../../shared/search';
import { getFromStorage, setInStorage } from '../../shared/storage';
import type { SearchFilter } from '../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import type { MediaShelfItem } from '../components/MediaShelf';
import {
    SEARCH_SECTION_BASE,
    buildSearchSections,
} from '../helpers/searchSections';
import { usePersonalisation } from '../hooks/usePersonalisation';
import { useSettings } from '../hooks/useSettings';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

const buildHomeSections = (): MediaSectionState[] => [
    {
        id: 'recent',
        title: 'Recently played',
        subtitle: 'Back in the rotation',
        view: 'list',
        infinite: 'columns',
        rows: 3,
        columns: 0,
        wideColumns: true,
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'top-tracks',
        title: 'Top tracks',
        subtitle: 'Your short-term replay list',
        view: 'list',
        infinite: null,
        rows: 7,
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'top-artists',
        title: 'Top artists',
        subtitle: 'Creators you gravitate to',
        view: 'card',
        infinite: 'columns',
        rows: 2,
        columns: 0,
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'new-releases',
        title: 'New releases',
        subtitle: 'Latest drops',
        view: 'card',
        infinite: 'columns',
        rows: 2,
        columns: 0,
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'featured-playlists',
        title: 'Featured playlists',
        subtitle: 'Freshly curated',
        view: 'card',
        infinite: 'columns',
        rows: 2,
        columns: 0,
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'saved-tracks',
        title: 'Saved tracks',
        subtitle: 'Your likes, right here',
        view: 'list',
        rows: 0,
        infinite: 'rows',
        clampUnit: 'items',
        items: [],
        hasMore: false,
        loadingMore: false,
    },
];

const HOME_LAYOUT_KEY = 'homeLayout';

type StoredHomeSection = Pick<
    MediaSectionState,
    | 'id'
    | 'title'
    | 'subtitle'
    | 'view'
    | 'columns'
    | 'rows'
    | 'infinite'
    | 'rowHeight'
    | 'columnWidth'
    | 'clampUnit'
    | 'wideColumns'
>;

const stripSection = (section: MediaSectionState): StoredHomeSection => ({
    id: section.id,
    title: section.title,
    subtitle: section.subtitle,
    view: section.view,
    columns: section.columns,
    rows: section.rows,
    infinite: section.infinite,
    rowHeight: section.rowHeight,
    columnWidth: section.columnWidth,
    clampUnit: section.clampUnit,
    wideColumns: section.wideColumns,
});

const sanitizeStored = (section: StoredHomeSection): StoredHomeSection => ({
    id: section.id,
    title: section.title,
    subtitle: section.subtitle,
    view: section.view,
    columns: section.columns,
    rows: section.rows,
    infinite: section.infinite,
    rowHeight: section.rowHeight,
    columnWidth: section.columnWidth,
    clampUnit: section.clampUnit,
    wideColumns: section.wideColumns,
});

const mergeLayout = (
    saved: StoredHomeSection[] | undefined
): MediaSectionState[] => {
    const defaults = buildHomeSections();
    if (!saved?.length) return defaults;

    const byId = new Map(defaults.map((section) => [section.id, section]));
    const merged: MediaSectionState[] = [];

    saved
        .filter(
            (stored): stored is StoredHomeSection =>
                !!stored && typeof stored.id === 'string'
        )
        .map((stored) => sanitizeStored(stored))
        .forEach((stored) => {
            const base = byId.get(stored.id);
            if (!base) return;
            merged.push({ ...base, ...stored, items: [] });
            byId.delete(stored.id);
        });

    byId.forEach((section) => merged.push(section));
    return merged;
};

const dedupeItems = (items: MediaShelfItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (!item.id) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
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
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const homeItemsRef = useRef<Record<string, MediaShelfItem[]>>({});
    const searchOffsetsRef = useRef<Record<SearchType, number | null>>({
        track: 0,
        album: 0,
        artist: 0,
        playlist: 0,
        show: 0,
        episode: 0,
        audiobook: 0,
    });

    const { heading, loading: headingLoading } = usePersonalisation({
        searchQuery,
        filters,
    });

    const searchContext = useMemo(
        () => buildSearchContext(searchQuery, filters),
        [filters, searchQuery]
    );

    const isSearching = searchContext.active;
    const activeSections = isSearching ? searchSections : homeSections;
    const isLoading = isSearching ? searchLoading : homeLoading;

    useEffect(() => {
        getFromStorage<StoredHomeSection[]>(HOME_LAYOUT_KEY, (saved) => {
            setHomeSections(mergeLayout(saved ?? undefined));
        });
    }, []);

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

    useEffect(() => {
        if (isSearching) return;
        const payload = homeSections.map(stripSection);
        void setInStorage(HOME_LAYOUT_KEY, payload);
    }, [homeSections, isSearching]);

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

    const resolveSearchType = useCallback((sectionId: string) => {
        return (Object.keys(SEARCH_SECTION_BASE) as SearchType[]).find(
            (key) => SEARCH_SECTION_BASE[key].id === sectionId
        );
    }, []);

    const loadMoreSearch = useCallback(
        async (sectionId: string) => {
            if (!isSearching || !searchContext.query) return;
            const type = resolveSearchType(sectionId);
            if (!type) return;
            const offset = searchOffsetsRef.current[type];
            if (offset == null) return;

            setSearchSections((prev) =>
                prev.map((section) =>
                    section.id === sectionId
                        ? { ...section, loadingMore: true }
                        : section
                )
            );

            try {
                const result = (await sendSpotifyMessage('search', {
                    query: searchContext.query,
                    types: [type] as ItemTypes[],
                    limit: SEARCH_LIMIT,
                    offset,
                })) as SearchResults<[ItemTypes]>;

                let items: MediaShelfItem[] = [];
                let hasMore = false;

                switch (type) {
                    case 'track': {
                        const page = result.tracks;
                        items = page?.items.map(trackToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'album': {
                        const page = result.albums;
                        items = page?.items.map(albumToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'artist': {
                        const page = result.artists;
                        items = page?.items.map(artistToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'playlist': {
                        const page = result.playlists;
                        items =
                            page?.items
                                .filter(
                                    (item): item is SimplifiedPlaylist => !!item
                                )
                                .map(playlistToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'show': {
                        const page = result.shows;
                        items = page?.items.map(showToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'episode': {
                        const page = result.episodes;
                        items =
                            page?.items.map((episode) =>
                                episodeToItem(episode, locale)
                            ) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                    case 'audiobook': {
                        const page = result.audiobooks;
                        items = page?.items.map(audiobookToItem) ?? [];
                        hasMore = !!page?.next;
                        break;
                    }
                }
                searchOffsetsRef.current[type] = hasMore
                    ? offset + SEARCH_LIMIT
                    : null;

                setSearchSections((prev) =>
                    prev.map((section) => {
                        if (section.id !== sectionId) return section;
                        return {
                            ...section,
                            items: [...section.items, ...items],
                            hasMore,
                            loadingMore: false,
                        };
                    })
                );
            } catch (error) {
                console.warn('[home] Search load more failed', error);
                setSearchSections((prev) =>
                    prev.map((section) =>
                        section.id === sectionId
                            ? { ...section, loadingMore: false }
                            : section
                    )
                );
            }
        },
        [isSearching, resolveSearchType, searchContext.query]
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
                        ? dedupeItems(
                              recentlyPlayed.value.items.map((entry) =>
                                  trackToItem(entry.track)
                              )
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
        searchOffsetsRef.current = {
            track: 0,
            album: 0,
            artist: 0,
            playlist: 0,
            show: 0,
            episode: 0,
            audiobook: 0,
        };

        const load = async () => {
            try {
                const result = (await sendSpotifyMessage('search', {
                    query: searchContext.query,
                    types: searchContext.types as ItemTypes[],
                    limit: SEARCH_LIMIT,
                })) as SearchResults<
                    [
                        'track',
                        'album',
                        'artist',
                        'playlist',
                        'show',
                        'episode',
                        'audiobook',
                    ]
                >;

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
                        result.playlists?.items
                            .filter(
                                (item): item is SimplifiedPlaylist => !!item
                            )
                            .map((playlist) => playlistToItem(playlist)) ?? [],
                    show:
                        result.shows?.items.map((show) => showToItem(show)) ??
                        [],
                    episode:
                        result.episodes?.items.map((episode) =>
                            episodeToItem(episode, locale)
                        ) ?? [],
                    audiobook:
                        result.audiobooks?.items.map((book) =>
                            audiobookToItem(book)
                        ) ?? [],
                };

                searchOffsetsRef.current = {
                    track: result.tracks?.next ? SEARCH_LIMIT : null,
                    album: result.albums?.next ? SEARCH_LIMIT : null,
                    artist: result.artists?.next ? SEARCH_LIMIT : null,
                    playlist: result.playlists?.next ? SEARCH_LIMIT : null,
                    show: result.shows?.next ? SEARCH_LIMIT : null,
                    episode: result.episodes?.next ? SEARCH_LIMIT : null,
                    audiobook: result.audiobooks?.next ? SEARCH_LIMIT : null,
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
                            hasMore:
                                type === 'track'
                                    ? !!result.tracks?.next
                                    : type === 'album'
                                      ? !!result.albums?.next
                                      : type === 'artist'
                                        ? !!result.artists?.next
                                        : type === 'playlist'
                                          ? !!result.playlists?.next
                                          : type === 'show'
                                            ? !!result.shows?.next
                                            : type === 'episode'
                                              ? !!result.episodes?.next
                                              : !!result.audiobooks?.next,
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

    const isEditable = editing && !isSearching;
    const visibleSections = useMemo(
        () =>
            isEditable || isLoading
                ? activeSections
                : activeSections.filter((section) => section.items.length > 0),
        [activeSections, isEditable, isLoading]
    );

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="no-overflow-anchor min-h-0 min-w-0 overflow-y-auto [scrollbar-gutter:stable]"
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
                            <Skeleton
                                loading={headingLoading}
                                className="inline-flex w-fit"
                            >
                                <Text size="3" weight="bold">
                                    {heading.title}
                                </Text>
                            </Skeleton>
                        )}

                        {isEditable && (
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

                        {!isSearching && (
                            <Flex align="center" gap="1" ml="auto">
                                <Text size="1" color="gray">
                                    Edit
                                </Text>
                                <Switch
                                    size="1"
                                    checked={isEditable}
                                    onCheckedChange={setEditing}
                                    aria-label="Toggle customise mode"
                                />
                            </Flex>
                        )}

                        {isEditable && (
                            <div className="pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                        )}
                    </Flex>

                    {!isEditable && (
                        <Skeleton
                            loading={headingLoading}
                            className="inline-flex w-fit"
                        >
                            <Text size="1" color="gray">
                                {heading.subtitle}
                            </Text>
                        </Skeleton>
                    )}
                </Flex>

                <DragDropContext onDragEnd={onSectionDragEnd}>
                    <Droppable
                        droppableId="home-sections"
                        direction="vertical"
                        isDropDisabled={!isEditable}
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
                                        isDragDisabled={!isEditable}
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
                                                    editing={isEditable}
                                                    preview={isLoading}
                                                    dragging={
                                                        dragSnapshot.isDragging
                                                    }
                                                    onChange={updateSection}
                                                    onDelete={removeSection}
                                                    onReorderItems={updateItems}
                                                    onLoadMore={
                                                        isSearching
                                                            ? loadMoreSearch
                                                            : undefined
                                                    }
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
