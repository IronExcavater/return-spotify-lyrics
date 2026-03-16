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

import { resolveLocale } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
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
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { usePersonalisation } from '../hooks/usePersonalisation';
import { useSettings } from '../hooks/useSettings';
import { readSpotify, useSpotifyRead } from '../hooks/useSpotifyRead';
import { SEARCH_SECTION_BASE, buildSearchSections } from './searchSections';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

const logger = createLogger('home');

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
        infinite: 'columns',
        rows: 6,
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
        view: 'list',
        infinite: 'columns',
        rows: 5,
        columns: 0,
        items: [],
        hasMore: false,
        loadingMore: false,
    },
    {
        id: 'user-playlists',
        title: 'Your playlists',
        subtitle: 'Saved in your library',
        view: 'card',
        cardSize: 3,
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
const SEARCH_TYPES = Object.keys(SEARCH_SECTION_BASE) as SearchType[];
const INITIAL_HOME_SECTION_COUNT = 3;

type SearchQueryData = {
    itemsByType: Record<SearchType, MediaShelfItem[]>;
    hasMoreByType: Record<SearchType, boolean>;
    nextOffsets: Record<SearchType, number | null>;
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

const sameIds = (left: string[], right: string[]) =>
    left.length === right.length &&
    left.every((value, index) => value === right[index]);

const createSearchOffsets = (value: number | null) => ({
    track: value,
    album: value,
    artist: value,
    playlist: value,
    show: value,
    episode: value,
    audiobook: value,
});

const findSearchTypeBySectionId = (sectionId: string) =>
    SEARCH_TYPES.find((type) => SEARCH_SECTION_BASE[type].id === sectionId);

const loadTopArtistsItems = async () => {
    let items: MediaShelfItem[] = [];

    try {
        const shortTerm = await sendSpotifyMessage('getTopArtists', {
            limit: 50,
            timeRange: 'short_term',
        });
        items = shortTerm.items.map((artist) => topArtistToItem(artist));
    } catch (error) {
        logError(logger, 'Top artists request failed', error);
    }

    if (items.length >= 12) return items;

    const merged = new Map<string, MediaShelfItem>();
    items.forEach((item) => {
        if (item.id) merged.set(item.id, item);
    });

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

        fallbacks.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            result.value.items.forEach((artist) => {
                const item = topArtistToItem(artist);
                if (item.id && !merged.has(item.id)) {
                    merged.set(item.id, item);
                }
            });
        });
    } catch (error) {
        logError(logger, 'Top artists fallback failed', error);
    }

    return Array.from(merged.values()).slice(0, 50);
};

const loadTopTracksItems = async () => {
    let items: MediaShelfItem[] = [];

    try {
        const shortTerm = await sendSpotifyMessage('getTopTracks', {
            limit: 50,
            timeRange: 'short_term',
        });
        items = shortTerm.items.map((track) => trackToItem(track));
    } catch (error) {
        logError(logger, 'Top tracks request failed', error);
    }

    if (items.length >= 12) return items;

    const merged = new Map<string, MediaShelfItem>();
    items.forEach((item) => {
        if (item.id) merged.set(item.id, item);
    });

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

        fallbacks.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            result.value.items.forEach((track) => {
                const item = trackToItem(track);
                if (item.id && !merged.has(item.id)) {
                    merged.set(item.id, item);
                }
            });
        });
    } catch (error) {
        logError(logger, 'Top tracks fallback failed', error);
    }

    return Array.from(merged.values()).slice(0, 50);
};

const loadSearchResults = async (
    query: string,
    types: SearchType[],
    locale: string
): Promise<SearchQueryData> => {
    const result = (await sendSpotifyMessage('search', {
        query,
        types: types as ItemTypes[],
        limit: SEARCH_LIMIT,
    })) as SearchResults<
        ['track', 'album', 'artist', 'playlist', 'show', 'episode', 'audiobook']
    >;

    return {
        itemsByType: {
            track:
                result.tracks?.items.map((track) => trackToItem(track)) ?? [],
            album:
                result.albums?.items.map((album) => albumToItem(album)) ?? [],
            artist:
                result.artists?.items.map((artist) => artistToItem(artist)) ??
                [],
            playlist:
                result.playlists?.items
                    .filter((item): item is SimplifiedPlaylist => !!item)
                    .map((playlist) => playlistToItem(playlist)) ?? [],
            show: result.shows?.items.map((show) => showToItem(show)) ?? [],
            episode:
                result.episodes?.items.map((episode) =>
                    episodeToItem(episode, locale)
                ) ?? [],
            audiobook:
                result.audiobooks?.items.map((book) => audiobookToItem(book)) ??
                [],
        },
        hasMoreByType: {
            track: !!result.tracks?.next,
            album: !!result.albums?.next,
            artist: !!result.artists?.next,
            playlist: !!result.playlists?.next,
            show: !!result.shows?.next,
            episode: !!result.episodes?.next,
            audiobook: !!result.audiobooks?.next,
        },
        nextOffsets: {
            track: result.tracks?.next ? SEARCH_LIMIT : null,
            album: result.albums?.next ? SEARCH_LIMIT : null,
            artist: result.artists?.next ? SEARCH_LIMIT : null,
            playlist: result.playlists?.next ? SEARCH_LIMIT : null,
            show: result.shows?.next ? SEARCH_LIMIT : null,
            episode: result.episodes?.next ? SEARCH_LIMIT : null,
            audiobook: result.audiobooks?.next ? SEARCH_LIMIT : null,
        },
    };
};

const loadSearchPage = async (
    query: string,
    type: SearchType,
    offset: number,
    locale: string
) => {
    const result = (await sendSpotifyMessage('search', {
        query,
        types: [type] as ItemTypes[],
        limit: SEARCH_LIMIT,
        offset,
    })) as SearchResults<[ItemTypes]>;

    switch (type) {
        case 'track':
            return {
                items:
                    result.tracks?.items.map((track) => trackToItem(track)) ??
                    [],
                hasMore: !!result.tracks?.next,
            };
        case 'album':
            return {
                items:
                    result.albums?.items.map((album) => albumToItem(album)) ??
                    [],
                hasMore: !!result.albums?.next,
            };
        case 'artist':
            return {
                items:
                    result.artists?.items.map((artist) =>
                        artistToItem(artist)
                    ) ?? [],
                hasMore: !!result.artists?.next,
            };
        case 'playlist':
            return {
                items:
                    result.playlists?.items
                        .filter((item): item is SimplifiedPlaylist => !!item)
                        .map((playlist) => playlistToItem(playlist)) ?? [],
                hasMore: !!result.playlists?.next,
            };
        case 'show':
            return {
                items:
                    result.shows?.items.map((show) => showToItem(show)) ?? [],
                hasMore: !!result.shows?.next,
            };
        case 'episode':
            return {
                items:
                    result.episodes?.items.map((episode) =>
                        episodeToItem(episode, locale)
                    ) ?? [],
                hasMore: !!result.episodes?.next,
            };
        case 'audiobook':
            return {
                items:
                    result.audiobooks?.items.map((book) =>
                        audiobookToItem(book)
                    ) ?? [],
                hasMore: !!result.audiobooks?.next,
            };
    }
};

export function HomeView({ searchQuery, filters }: Props) {
    const [homeSections, setHomeSections] = useState<MediaSectionState[]>(() =>
        buildHomeSections()
    );
    const [searchSections, setSearchSections] = useState<MediaSectionState[]>(
        () => buildSearchSections(DEFAULT_SEARCH_TYPES)
    );
    const [editing, setEditing] = useState(false);
    const [activeHomeSectionIds, setActiveHomeSectionIds] = useState<string[]>(
        () =>
            buildHomeSections()
                .slice(0, INITIAL_HOME_SECTION_COUNT)
                .map((section) => section.id)
    );
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
    const searchTypesKey = useMemo(
        () => searchContext.types.join(','),
        [searchContext.types]
    );
    const searchQueryKey = useMemo(
        () =>
            isSearching && searchContext.query
                ? `search:${searchContext.query}:${searchTypesKey}:${locale}`
                : null,
        [isSearching, locale, searchContext.query, searchTypesKey]
    );
    const activeHomeSectionSet = useMemo(
        () =>
            new Set(
                editing
                    ? homeSections.map((section) => section.id)
                    : activeHomeSectionIds
            ),
        [activeHomeSectionIds, editing, homeSections]
    );

    const recentState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/recent',
        staleMs: 2 * 60 * 1000,
        cacheMs: 15 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('recent'),
        load: async () => {
            const recentlyPlayed = await sendSpotifyMessage(
                'getRecentlyPlayedTracks',
                { limit: 20 }
            );
            return dedupeItems(
                recentlyPlayed.items.map((entry) => trackToItem(entry.track))
            );
        },
    });
    const topTracksState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/top-tracks',
        staleMs: 6 * 60 * 60 * 1000,
        cacheMs: 24 * 60 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('top-tracks'),
        load: loadTopTracksItems,
    });
    const topArtistsState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/top-artists',
        staleMs: 6 * 60 * 60 * 1000,
        cacheMs: 24 * 60 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('top-artists'),
        load: loadTopArtistsItems,
    });
    const newReleasesState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/new-releases',
        staleMs: 6 * 60 * 60 * 1000,
        cacheMs: 24 * 60 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('new-releases'),
        load: async () => {
            const newReleases = await sendSpotifyMessage('getNewReleases', {
                limit: 20,
            });
            return newReleases.albums.items.map((album) => albumToItem(album));
        },
    });
    const playlistsState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/user-playlists',
        staleMs: 15 * 60 * 1000,
        cacheMs: 60 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('user-playlists'),
        load: async () => {
            const playlists = await sendSpotifyMessage('getUserPlaylists', {
                limit: 20,
            });
            return playlists.items.map((playlist) => playlistToItem(playlist));
        },
    });
    const savedTracksState = useSpotifyRead<MediaShelfItem[]>({
        key: 'home/saved-tracks',
        staleMs: 5 * 60 * 1000,
        cacheMs: 30 * 60 * 1000,
        enabled: !isSearching && activeHomeSectionSet.has('saved-tracks'),
        load: async () => {
            const saved = await sendSpotifyMessage('getSavedTracks', {
                limit: 20,
            });
            return saved.items.map((entry) => trackToItem(entry.track));
        },
    });
    const searchState = useSpotifyRead<SearchQueryData>({
        key: searchQueryKey ?? 'search:idle',
        staleMs: 45_000,
        cacheMs: 10 * 60 * 1000,
        enabled: Boolean(searchQueryKey && searchContext.query),
        load: () =>
            loadSearchResults(searchContext.query, searchContext.types, locale),
    });
    const draggableSections = isSearching ? searchSections : homeSections;
    const homeSectionLoadingById = useMemo(
        () => ({
            recent:
                recentState.status === 'loading' &&
                (recentState.data?.length ?? 0) === 0,
            'top-tracks':
                topTracksState.status === 'loading' &&
                (topTracksState.data?.length ?? 0) === 0,
            'top-artists':
                topArtistsState.status === 'loading' &&
                (topArtistsState.data?.length ?? 0) === 0,
            'new-releases':
                newReleasesState.status === 'loading' &&
                (newReleasesState.data?.length ?? 0) === 0,
            'user-playlists':
                playlistsState.status === 'loading' &&
                (playlistsState.data?.length ?? 0) === 0,
            'saved-tracks':
                savedTracksState.status === 'loading' &&
                (savedTracksState.data?.length ?? 0) === 0,
        }),
        [
            newReleasesState.data?.length,
            newReleasesState.status,
            playlistsState.data?.length,
            playlistsState.status,
            recentState.data?.length,
            recentState.status,
            savedTracksState.data?.length,
            savedTracksState.status,
            topArtistsState.data?.length,
            topArtistsState.status,
            topTracksState.data?.length,
            topTracksState.status,
        ]
    );
    const searchLoading = isSearching && searchState.status === 'loading';

    useEffect(() => {
        void getFromStorage<StoredHomeSection[]>(HOME_LAYOUT_KEY, (saved) => {
            setHomeSections(mergeLayout(saved ?? undefined));
        });
    }, []);

    useEffect(() => {
        if (isSearching) return;

        const orderedIds = homeSections.map((section) => section.id);
        const seedIds = editing
            ? orderedIds
            : orderedIds.slice(0, INITIAL_HOME_SECTION_COUNT);

        setActiveHomeSectionIds((previous) => {
            const retained = previous.filter((id) => orderedIds.includes(id));
            const next = Array.from(new Set([...retained, ...seedIds]));
            return sameIds(previous, next) ? previous : next;
        });
    }, [editing, homeSections, isSearching]);

    useEffect(() => {
        if (isSearching || editing) return;
        const orderedIds = homeSections.map((section) => section.id);
        const lastActiveId = [...orderedIds]
            .reverse()
            .find((id) => activeHomeSectionSet.has(id));

        if (!lastActiveId) return;

        const currentIndex = orderedIds.indexOf(lastActiveId);
        const nextId =
            currentIndex >= 0 && currentIndex < orderedIds.length - 1
                ? orderedIds[currentIndex + 1]
                : undefined;

        if (!nextId) return;

        const root = scrollContainerRef.current;
        const node = sectionRefs.current.get(lastActiveId);
        if (!root || !node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                setActiveHomeSectionIds((previous) =>
                    previous.includes(nextId) ? previous : [...previous, nextId]
                );
            },
            {
                root,
                rootMargin: '0px 0px 240px 0px',
            }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [activeHomeSectionSet, editing, homeSections, isSearching]);

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
            const next = [...draggableSections];
            const [moved] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, moved);
            setActiveSections(() => next);
        },
        [draggableSections, setActiveSections]
    );

    const loadMoreSearch = useCallback(
        async (sectionId: string) => {
            if (!isSearching || !searchContext.query) return;
            const type = findSearchTypeBySectionId(sectionId);
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
                const page = await readSpotify({
                    key: `search:${searchContext.query}:${type}:${offset}:${locale}`,
                    staleMs: 45_000,
                    cacheMs: 10 * 60 * 1000,
                    load: () =>
                        loadSearchPage(
                            searchContext.query,
                            type,
                            offset,
                            locale
                        ),
                });

                const items = page.items;
                const hasMore = page.hasMore;
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
        [isSearching, locale, searchContext.query]
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

    const homeItemsBySection = useMemo(
        () => ({
            recent: recentState.data ?? [],
            'top-tracks': topTracksState.data ?? [],
            'top-artists': topArtistsState.data ?? [],
            'new-releases': newReleasesState.data ?? [],
            'user-playlists': playlistsState.data ?? [],
            'saved-tracks': savedTracksState.data ?? [],
        }),
        [
            newReleasesState.data,
            playlistsState.data,
            recentState.data,
            savedTracksState.data,
            topArtistsState.data,
            topTracksState.data,
        ]
    );
    const resolvedHomeSections = useMemo(
        () =>
            homeSections.map((section) => {
                const items = homeItemsBySection[section.id];
                if (!items) return section;
                if (
                    section.items === items &&
                    section.hasMore === false &&
                    section.loadingMore === false
                ) {
                    return section;
                }
                return {
                    ...section,
                    items,
                    hasMore: false,
                    loadingMore: false,
                };
            }),
        [homeItemsBySection, homeSections]
    );

    useEffect(() => {
        if (isSearching) return;

        homeItemsRef.current = homeItemsBySection;
    }, [homeItemsBySection, isSearching]);

    useEffect(() => {
        if (!isSearching) {
            return;
        }
        if (!searchContext.query) {
            searchOffsetsRef.current = createSearchOffsets(0);
            return;
        }
        setSearchSections(buildSearchSections(searchContext.types));
        searchOffsetsRef.current = createSearchOffsets(0);
    }, [isSearching, searchContext.query, searchTypesKey]);

    useEffect(() => {
        if (!isSearching || !searchState.data) return;

        searchOffsetsRef.current = searchState.data.nextOffsets;
        setSearchSections((prev) =>
            prev.map((section) => {
                const type = findSearchTypeBySectionId(section.id);
                if (!type) return section;
                return {
                    ...section,
                    items: searchState.data.itemsByType[type],
                    hasMore: searchState.data.hasMoreByType[type],
                    loadingMore: false,
                };
            })
        );
    }, [isSearching, searchState.data]);

    useEffect(() => {
        if (!isSearching || !searchState.error) return;
        logError(logger, 'Search failed', searchState.error);
    }, [isSearching, searchState.error]);

    const isEditable = editing && !isSearching;
    const activeSections = isSearching ? searchSections : resolvedHomeSections;
    const alwaysVisibleSections = useMemo(
        () => new Set(['user-playlists', 'saved-tracks']),
        []
    );
    const visibleSections = useMemo(() => {
        if (isEditable) return activeSections;
        if (!isSearching) {
            return activeSections.filter((section) =>
                activeHomeSectionSet.has(section.id)
            );
        }
        return activeSections.filter(
            (section) =>
                section.items.length > 0 ||
                alwaysVisibleSections.has(section.id) ||
                (searchLoading && section.items.length === 0)
        );
    }, [
        activeSections,
        activeHomeSectionSet,
        alwaysVisibleSections,
        isEditable,
        isSearching,
        searchLoading,
    ]);

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="no-overflow-anchor scrollbar-gutter-stable min-h-0 min-w-0 overflow-y-auto"
            ref={scrollContainerRef}
        >
            <Flex
                pl="3"
                pr="1"
                py="2"
                direction="column"
                gap="1"
                className="min-w-0"
            >
                <Flex
                    justify="between"
                    direction="column"
                    className={clsx(
                        'relative min-w-0',
                        editing && 'bg-background sticky top-0 z-20'
                    )}
                    mx="-3"
                    px="3"
                    py="1"
                    mb={editing ? '4' : undefined}
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
                            <div className="from-background pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-linear-to-b to-transparent" />
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
                                                    loading={
                                                        isSearching
                                                            ? searchLoading &&
                                                              section.items
                                                                  .length === 0
                                                            : (homeSectionLoadingById[
                                                                  section.id as keyof typeof homeSectionLoadingById
                                                              ] ?? false)
                                                    }
                                                    headerLoading={false}
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
