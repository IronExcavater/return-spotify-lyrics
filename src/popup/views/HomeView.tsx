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
import type { ItemTypes, SearchResults } from '@spotify/web-api-ts-sdk';
import clsx from 'clsx';

import { resolveLocale } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import {
    albumToItem,
    playlistToItem,
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
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { usePersonalisation } from '../hooks/usePersonalisation';
import { useSettings } from '../hooks/useSettings';
import {
    buildSearchOffsets,
    mapSearchPage,
    mapSearchResults,
} from '../utils/searchMapping';
import { buildHomeSections } from './homeSections';
import { SEARCH_SECTION_BASE, buildSearchSections } from './searchSections';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

const logger = createLogger('home');

const HOME_LAYOUT_KEY = 'homeLayout';
type SectionStatus = { loading: boolean; error: string | null };
const SEARCH_TYPE_BY_SECTION_ID: Record<string, SearchType> =
    Object.fromEntries(
        (Object.keys(SEARCH_SECTION_BASE) as SearchType[]).map((type) => [
            SEARCH_SECTION_BASE[type].id,
            type,
        ])
    ) as Record<string, SearchType>;

const describeRpcError = (error: unknown) => {
    if (error instanceof Error) return error.message || 'Request failed.';
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
    ) {
        return (error as { message: string }).message || 'Request failed.';
    }
    if (typeof error === 'string' && error.trim().length > 0) return error;
    return 'Request failed.';
};

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
    | 'cardSize'
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
    cardSize: section.cardSize,
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
    cardSize: section.cardSize,
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
    const [homeStatus, setHomeStatus] = useState<Record<string, SectionStatus>>(
        {}
    );
    const [searchStatus, setSearchStatus] = useState<
        Record<string, SectionStatus>
    >({});
    const [homeRefreshKey, setHomeRefreshKey] = useState(0);
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const homeItemsRef = useRef<Record<string, MediaShelfItem[]>>({});
    const homeSectionsRef = useRef<MediaSectionState[]>(homeSections);
    const homeLoadSeqRef = useRef<Record<string, number>>({});
    const searchLoadSeqRef = useRef(0);
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
    const statusById = isSearching ? searchStatus : homeStatus;
    const isLoading = activeSections.some(
        (section) => statusById[section.id]?.loading
    );

    useEffect(() => {
        void getFromStorage<StoredHomeSection[]>(HOME_LAYOUT_KEY, (saved) => {
            setHomeSections(mergeLayout(saved ?? undefined));
        });
    }, []);

    useEffect(() => {
        homeSectionsRef.current = homeSections;
    }, [homeSections]);

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
        return SEARCH_TYPE_BY_SECTION_ID[sectionId];
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

                const { items, hasMore, nextOffset } = mapSearchPage(
                    type,
                    result,
                    locale
                );
                searchOffsetsRef.current[type] = nextOffset;

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
                logError(logger, 'Search load more failed', error);
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

    const loadHomeSection = useCallback(
        async (sectionId: string, options: { markLoading?: boolean } = {}) => {
            if (isSearching) return;
            const seq = (homeLoadSeqRef.current[sectionId] ?? 0) + 1;
            homeLoadSeqRef.current[sectionId] = seq;
            if (options.markLoading !== false) {
                setHomeStatus((prev) => ({
                    ...prev,
                    [sectionId]: { loading: true, error: null },
                }));
            }

            try {
                let items: MediaShelfItem[] = [];
                switch (sectionId) {
                    case 'recent': {
                        const recentlyPlayed = await sendSpotifyMessage(
                            'getRecentlyPlayedTracks',
                            { limit: 20 }
                        );
                        items = dedupeItems(
                            recentlyPlayed.items.map((entry) =>
                                trackToItem(entry.track)
                            )
                        );
                        break;
                    }
                    case 'top-tracks': {
                        const topTracks = await sendSpotifyMessage(
                            'getTopTracks',
                            { limit: 20, timeRange: 'short_term' }
                        );
                        let topTracksItems = topTracks.items.map((track) =>
                            trackToItem(track)
                        );
                        if (topTracksItems.length < 12) {
                            try {
                                const fallbacks = await Promise.allSettled([
                                    sendSpotifyMessage('getTopTracks', {
                                        limit: 50,
                                        timeRange: 'medium_term',
                                    }),
                                    sendSpotifyMessage('getTopTracks', {
                                        limit: 50,
                                        timeRange: 'long_term',
                                    }),
                                ]);
                                const merged = new Map<
                                    string,
                                    MediaShelfItem
                                >();
                                topTracksItems.forEach((item) => {
                                    if (item.id) merged.set(item.id, item);
                                });
                                fallbacks.forEach((result) => {
                                    if (result.status !== 'fulfilled') return;
                                    result.value.items.forEach((track) => {
                                        const item = trackToItem(track);
                                        if (item.id && !merged.has(item.id)) {
                                            merged.set(item.id, item);
                                        }
                                    });
                                });
                                topTracksItems = Array.from(
                                    merged.values()
                                ).slice(0, 50);
                            } catch (error) {
                                logError(
                                    logger,
                                    'Top tracks fallback failed',
                                    error
                                );
                            }
                        }
                        items = topTracksItems;
                        break;
                    }
                    case 'top-artists': {
                        const topArtists = await sendSpotifyMessage(
                            'getTopArtists',
                            { limit: 50, timeRange: 'short_term' }
                        );
                        let topArtistsItems = topArtists.items.map((artist) =>
                            topArtistToItem(artist)
                        );
                        if (topArtistsItems.length < 12) {
                            try {
                                const fallbacks = await Promise.allSettled([
                                    sendSpotifyMessage('getTopArtists', {
                                        limit: 50,
                                        timeRange: 'medium_term',
                                    }),
                                    sendSpotifyMessage('getTopArtists', {
                                        limit: 50,
                                        timeRange: 'long_term',
                                    }),
                                ]);
                                const merged = new Map<
                                    string,
                                    MediaShelfItem
                                >();
                                topArtistsItems.forEach((item) => {
                                    if (item.id) merged.set(item.id, item);
                                });
                                fallbacks.forEach((result) => {
                                    if (result.status !== 'fulfilled') return;
                                    result.value.items.forEach((artist) => {
                                        const item = topArtistToItem(artist);
                                        if (item.id && !merged.has(item.id)) {
                                            merged.set(item.id, item);
                                        }
                                    });
                                });
                                topArtistsItems = Array.from(
                                    merged.values()
                                ).slice(0, 50);
                            } catch (error) {
                                logError(
                                    logger,
                                    'Top artists fallback failed',
                                    error
                                );
                            }
                        }
                        items = topArtistsItems;
                        break;
                    }
                    case 'new-releases': {
                        const newReleases = await sendSpotifyMessage(
                            'getNewReleases',
                            { limit: 20 }
                        );
                        items = newReleases.albums.items.map((album) =>
                            albumToItem(album)
                        );
                        break;
                    }
                    case 'user-playlists': {
                        const userPlaylists = await sendSpotifyMessage(
                            'getUserPlaylists',
                            { limit: 20 }
                        );
                        items = userPlaylists.items.map((playlist) =>
                            playlistToItem(playlist)
                        );
                        break;
                    }
                    case 'saved-tracks': {
                        const saved = await sendSpotifyMessage(
                            'getSavedTracks',
                            { limit: 20 }
                        );
                        items = saved.items.map((entry) =>
                            trackToItem(entry.track)
                        );
                        break;
                    }
                    default:
                        return;
                }

                if (homeLoadSeqRef.current[sectionId] !== seq) return;

                homeItemsRef.current = {
                    ...homeItemsRef.current,
                    [sectionId]: items,
                };
                setHomeSections((prev) =>
                    prev.map((section) =>
                        section.id === sectionId
                            ? {
                                  ...section,
                                  items,
                                  hasMore: false,
                                  loadingMore: false,
                              }
                            : section
                    )
                );
                setHomeStatus((prev) => ({
                    ...prev,
                    [sectionId]: { loading: false, error: null },
                }));
            } catch (error) {
                if (homeLoadSeqRef.current[sectionId] !== seq) return;
                logError(logger, `Home section ${sectionId} failed`, error);
                setHomeStatus((prev) => ({
                    ...prev,
                    [sectionId]: {
                        loading: false,
                        error: describeRpcError(error),
                    },
                }));
            }
        },
        [isSearching]
    );

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
            if (!cachedItems?.length) {
                void loadHomeSection(id);
            }
        },
        [isSearching, loadHomeSection]
    );

    const reloadSearch = useCallback(() => {
        if (!searchContext.query) return;
        const seq = searchLoadSeqRef.current + 1;
        searchLoadSeqRef.current = seq;

        const nextSections = buildSearchSections(searchContext.types);
        const nextSectionIds = nextSections.map((section) => section.id);
        setSearchSections((prev) => {
            const prevById = new Map(
                prev.map((section) => [section.id, section])
            );
            return nextSections.map((template) => {
                const existing = prevById.get(template.id);
                if (!existing) return template;
                return {
                    ...template,
                    items: existing.items,
                    hasMore: existing.hasMore,
                    loadingMore: false,
                };
            });
        });
        setSearchStatus(() => {
            const next: Record<string, SectionStatus> = {};
            nextSectionIds.forEach((id) => {
                next[id] = { loading: true, error: null };
            });
            return next;
        });
        searchOffsetsRef.current = {
            track: 0,
            album: 0,
            artist: 0,
            playlist: 0,
            show: 0,
            episode: 0,
            audiobook: 0,
        };

        void (async () => {
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

                if (searchLoadSeqRef.current !== seq) return;

                const { itemsByType, hasMoreByType } = mapSearchResults(
                    result,
                    locale
                );
                searchOffsetsRef.current = buildSearchOffsets(
                    result,
                    SEARCH_LIMIT
                );

                setSearchSections((prev) =>
                    prev.map((section) => {
                        const type = SEARCH_TYPE_BY_SECTION_ID[section.id];
                        if (!type) return section;
                        return {
                            ...section,
                            items: itemsByType[type],
                            hasMore: hasMoreByType[type],
                            loadingMore: false,
                        };
                    })
                );
                setSearchStatus(
                    nextSections.reduce<Record<string, SectionStatus>>(
                        (acc, section) => {
                            acc[section.id] = { loading: false, error: null };
                            return acc;
                        },
                        {}
                    )
                );
            } catch (error) {
                if (searchLoadSeqRef.current !== seq) return;
                logError(logger, 'Search failed', error);
                const message = describeRpcError(error);
                setSearchStatus(
                    nextSections.reduce<Record<string, SectionStatus>>(
                        (acc, section) => {
                            acc[section.id] = {
                                loading: false,
                                error: message,
                            };
                            return acc;
                        },
                        {}
                    )
                );
            }
        })();
    }, [locale, searchContext.query, searchContext.types]);

    const handleSectionRetry = useCallback(
        (sectionId: string) => {
            if (isSearching) {
                if (!searchContext.query) return;
                reloadSearch();
                return;
            }
            void loadHomeSection(sectionId);
        },
        [isSearching, loadHomeSection, reloadSearch, searchContext.query]
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
        const ids = homeSectionsRef.current.map((section) => section.id);
        if (ids.length === 0) return;
        setHomeStatus((prev) => {
            const next: Record<string, SectionStatus> = { ...prev };
            ids.forEach((id) => {
                next[id] = { loading: true, error: null };
            });
            return next;
        });
        ids.forEach((id) => {
            void loadHomeSection(id, { markLoading: false });
        });
    }, [homeRefreshKey, isSearching, loadHomeSection]);

    useEffect(() => {
        if (!isSearching || !searchContext.query) {
            setSearchStatus({});
            return;
        }
        reloadSearch();
    }, [isSearching, reloadSearch, searchContext.query]);

    const isEditable = editing && !isSearching;
    const alwaysVisibleSections = useMemo(
        () => new Set(['user-playlists', 'saved-tracks']),
        []
    );
    const visibleSections = useMemo(
        () =>
            isEditable || isLoading
                ? activeSections
                : activeSections.filter(
                      (section) =>
                          section.items.length > 0 ||
                          alwaysVisibleSections.has(section.id) ||
                          Boolean(statusById[section.id]?.error)
                  ),
        [
            activeSections,
            alwaysVisibleSections,
            isEditable,
            isLoading,
            statusById,
        ]
    );

    const headerContent = (
        <Flex
            justify="between"
            direction="column"
            className={clsx('relative min-w-0', isEditable && 'bg-background')}
            mx="-3"
            px="3"
            py="1"
            mb={isEditable ? '4' : undefined}
        >
            <Flex>
                {!editing && (
                    <SkeletonText
                        loading={headingLoading}
                        parts={[heading.title, heading.subtitle]}
                        preset="media-row"
                        variant="title"
                        fullWidth={false}
                        className="inline-flex"
                    >
                        <Text size="3" weight="bold">
                            {heading.title}
                        </Text>
                    </SkeletonText>
                )}

                {isEditable && (
                    <Flex align="center" gap="2" className="relative">
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger
                                onKeyDown={handleMenuTriggerKeyDown}
                            >
                                <IconButton
                                    size="1"
                                    variant="soft"
                                    color="green"
                                    radius="full"
                                    aria-label="Add section"
                                    disabled={
                                        availableHomeSections.length === 0
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
                                {availableHomeSections.map((section) => (
                                    <DropdownMenu.Item
                                        key={section.id}
                                        onSelect={() => addSection(section.id)}
                                    >
                                        {section.title}
                                    </DropdownMenu.Item>
                                ))}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>

                        <AlertDialog.Root>
                            <AlertDialog.Trigger>
                                <Button size="1" variant="soft" color="red">
                                    Restore
                                </Button>
                            </AlertDialog.Trigger>
                            <AlertDialog.Content maxWidth="260px" size="1">
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
                    <div className="from-background pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-linear-to-b to-transparent" />
                )}
            </Flex>

            {!isEditable && (
                <SkeletonText
                    loading={headingLoading}
                    parts={[heading.subtitle, heading.title]}
                    preset="media-row"
                    variant="subtitle"
                    fullWidth={false}
                    className="inline-flex"
                >
                    <Text size="1" color="gray">
                        {heading.subtitle}
                    </Text>
                </SkeletonText>
            )}
        </Flex>
    );

    return (
        <StickyLayout.Root className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <Flex
                pl="3"
                pr="1"
                py="2"
                direction="column"
                gap="1"
                className="min-w-0"
            >
                {isEditable ? (
                    <StickyLayout.Sticky
                        order={0}
                        className="z-20"
                        heightOffset={15}
                    >
                        {headerContent}
                    </StickyLayout.Sticky>
                ) : (
                    headerContent
                )}

                <StickyLayout.Body>
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
                                    gap="2"
                                    ref={dropProvided.innerRef}
                                    {...dropProvided.droppableProps}
                                >
                                    {visibleSections.map((section, index) => {
                                        const status =
                                            statusById[section.id] ?? null;
                                        const isSectionLoading =
                                            status?.loading ?? false;
                                        const errorMessage =
                                            status?.error ?? null;
                                        return (
                                            <Draggable
                                                key={section.id}
                                                draggableId={section.id}
                                                index={index}
                                                isDragDisabled={!isEditable}
                                            >
                                                {(
                                                    dragProvided,
                                                    dragSnapshot
                                                ) => (
                                                    <div
                                                        ref={(node) => {
                                                            dragProvided.innerRef(
                                                                node
                                                            );
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
                                                                .draggableProps
                                                                .style,
                                                        }}
                                                    >
                                                        <MediaSection
                                                            section={section}
                                                            editing={isEditable}
                                                            stickyHeader={
                                                                !isEditable
                                                            }
                                                            loading={
                                                                isSectionLoading
                                                            }
                                                            headerLoading={
                                                                false
                                                            }
                                                            errorMessage={
                                                                errorMessage
                                                            }
                                                            onRetry={
                                                                handleSectionRetry
                                                            }
                                                            dragging={
                                                                dragSnapshot.isDragging
                                                            }
                                                            onChange={
                                                                updateSection
                                                            }
                                                            onDelete={
                                                                removeSection
                                                            }
                                                            onReorderItems={
                                                                updateItems
                                                            }
                                                            onLoadMore={
                                                                isSearching
                                                                    ? loadMoreSearch
                                                                    : undefined
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {dropProvided.placeholder}
                                </Flex>
                            )}
                        </Droppable>
                    </DragDropContext>
                </StickyLayout.Body>
            </Flex>
        </StickyLayout.Root>
    );
}
