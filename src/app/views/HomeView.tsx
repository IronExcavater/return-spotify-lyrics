import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { ItemTypes, SearchResults } from '@spotify/web-api-ts-sdk';

import { resolveLocale } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import { sendSpotifyMessage } from '../../shared/messaging';
import {
    DEFAULT_SEARCH_TYPES,
    SEARCH_LIMIT,
    buildSearchContext,
    type SearchType,
} from '../../shared/search';
import type { SearchFilter } from '../../shared/types';
import type { MediaSectionState } from '../components/media/MediaSection';
import { StickyLayout } from '../components/StickyLayout';
import { HomeSectionList } from '../features/home/HomeSectionList';
import { HomeViewHeader } from '../features/home/HomeViewHeader';
import {
    ALWAYS_VISIBLE_HOME_SECTIONS,
    readHomeLayout,
    saveHomeLayout,
} from '../features/home/layout';
import {
    HOME_SECTION_LOADERS,
    type HomeSectionId,
} from '../features/home/loaders';
import { buildSearchSections } from '../features/home/searchSections';
import { buildHomeSections } from '../features/home/sections';
import {
    SEARCH_TYPE_BY_SECTION_ID,
    createSearchOffsets,
    describeRpcError,
    type SectionMode,
    type SectionStatus,
    type StatusByMode,
} from '../features/home/state';
import { usePersonalisation } from '../hooks/usePersonalisation';
import { useSettings } from '../hooks/useSettings';
import type { MediaShelfItem } from '../types/mediaShelf';
import {
    buildSearchOffsets,
    mapSearchPage,
    mapSearchResults,
} from '../utils/searchMapping';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

const logger = createLogger('home');

export function HomeView({ searchQuery, filters }: Props) {
    const [homeSections, setHomeSections] = useState<MediaSectionState[]>(() =>
        buildHomeSections()
    );
    const [searchSections, setSearchSections] = useState<MediaSectionState[]>(
        () => buildSearchSections(DEFAULT_SEARCH_TYPES)
    );
    const [editing, setEditing] = useState(false);
    const [statusByMode, setStatusByMode] = useState<StatusByMode>({
        home: {},
        search: {},
    });
    const [homeRefreshKey, setHomeRefreshKey] = useState(0);
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);

    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const homeItemsRef = useRef<Record<string, MediaShelfItem[]>>({});
    const homeSectionsRef = useRef<MediaSectionState[]>(homeSections);
    const homeLoadSeqRef = useRef<Record<string, number>>({});
    const searchLoadSeqRef = useRef(0);
    const searchOffsetsRef = useRef<Record<SearchType, number | null>>(
        createSearchOffsets()
    );

    const { heading, loading: headingLoading } = usePersonalisation({
        searchQuery,
        filters,
    });

    const searchContext = useMemo(
        () => buildSearchContext(searchQuery, filters),
        [filters, searchQuery]
    );

    const isSearching = searchContext.active;
    const activeMode: SectionMode = isSearching ? 'search' : 'home';
    const activeSections = isSearching ? searchSections : homeSections;
    const statusById = statusByMode[activeMode];
    const isLoading = activeSections.some(
        (section) => statusById[section.id]?.loading
    );

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const nextSections = await readHomeLayout();
            if (cancelled) return;

            setHomeSections(nextSections);
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        homeSectionsRef.current = homeSections;
    }, [homeSections]);

    const updateStatuses = useCallback(
        (
            mode: SectionMode,
            updater: (
                previous: Record<string, SectionStatus>
            ) => Record<string, SectionStatus>
        ) => {
            setStatusByMode((previous) => ({
                ...previous,
                [mode]: updater(previous[mode]),
            }));
        },
        []
    );

    const setSectionStatus = useCallback(
        (mode: SectionMode, sectionId: string, status: SectionStatus) => {
            updateStatuses(mode, (previous) => ({
                ...previous,
                [sectionId]: status,
            }));
        },
        [updateStatuses]
    );

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
        void saveHomeLayout(homeSections);
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
                setSectionStatus('home', sectionId, {
                    loading: true,
                    error: null,
                });
            }

            try {
                const loadItems =
                    HOME_SECTION_LOADERS[sectionId as HomeSectionId];
                if (!loadItems) return;

                const items = await loadItems();

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
                setSectionStatus('home', sectionId, {
                    loading: false,
                    error: null,
                });
            } catch (error) {
                if (homeLoadSeqRef.current[sectionId] !== seq) return;
                logError(logger, `Home section ${sectionId} failed`, error);
                setSectionStatus('home', sectionId, {
                    loading: false,
                    error: describeRpcError(error),
                });
            }
        },
        [isSearching, setSectionStatus]
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
        updateStatuses('search', () =>
            nextSectionIds.reduce<Record<string, SectionStatus>>((next, id) => {
                next[id] = { loading: true, error: null };
                return next;
            }, {})
        );
        searchOffsetsRef.current = createSearchOffsets();

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
                updateStatuses('search', () =>
                    nextSections.reduce<Record<string, SectionStatus>>(
                        (acc, section) => {
                            acc[section.id] = {
                                loading: false,
                                error: null,
                            };
                            return acc;
                        },
                        {}
                    )
                );
            } catch (error) {
                if (searchLoadSeqRef.current !== seq) return;
                logError(logger, 'Search failed', error);
                const message = describeRpcError(error);
                updateStatuses('search', () =>
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
    }, [locale, searchContext.query, searchContext.types, updateStatuses]);

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
        updateStatuses('home', (previous) => {
            const next = { ...previous };
            ids.forEach((id) => {
                next[id] = { loading: true, error: null };
            });
            return next;
        });
        ids.forEach((id) => {
            void loadHomeSection(id, { markLoading: false });
        });
    }, [homeRefreshKey, isSearching, loadHomeSection, updateStatuses]);

    useEffect(() => {
        if (!isSearching || !searchContext.query) {
            updateStatuses('search', () => ({}));
            return;
        }
        reloadSearch();
    }, [isSearching, reloadSearch, searchContext.query, updateStatuses]);

    const isEditable = editing && !isSearching;
    const visibleSections = useMemo(
        () =>
            isEditable || isLoading
                ? activeSections
                : activeSections.filter(
                      (section) =>
                          section.items.length > 0 ||
                          ALWAYS_VISIBLE_HOME_SECTIONS.has(section.id) ||
                          Boolean(statusById[section.id]?.error)
                  ),
        [activeSections, isEditable, isLoading, statusById]
    );

    return (
        <StickyLayout.Root className="no-overflow-anchor scrollbar-gutter-stable relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="bg-background z-30 h-2 shrink-0" />
            <StickyLayout.Sticky
                order={0}
                className="z-30 pr-1 pl-3"
                heightOffset={15}
                disabled={!isEditable}
            >
                <HomeViewHeader
                    heading={heading}
                    headingLoading={headingLoading}
                    editing={editing}
                    isEditable={isEditable}
                    isSearching={isSearching}
                    availableHomeSections={availableHomeSections}
                    onEditingChange={setEditing}
                    onAddSection={addSection}
                    onRestore={resetSections}
                />
            </StickyLayout.Sticky>

            <StickyLayout.Body>
                <HomeSectionList
                    editing={isEditable}
                    isSearching={isSearching}
                    onChange={updateSection}
                    onDelete={removeSection}
                    onDragEnd={onSectionDragEnd}
                    onLoadMoreSearch={loadMoreSearch}
                    onReorderItems={updateItems}
                    onRetry={handleSectionRetry}
                    sectionRefs={sectionRefs}
                    sections={visibleSections}
                    statusById={statusById}
                />
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
