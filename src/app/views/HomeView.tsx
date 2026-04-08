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
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { usePersonalisation } from '../hooks/usePersonalisation';
import { useSettings } from '../hooks/useSettings';
import type { MediaShelfItem } from '../types/mediaShelf';
import {
    buildSearchOffsets,
    mapSearchPage,
    mapSearchResults,
} from '../utils/searchMapping';
import { HOME_SECTION_LOADERS, type HomeSectionId } from './homeLoaders';
import { buildHomeSections } from './homeSections';
import { SEARCH_SECTION_BASE, buildSearchSections } from './searchSections';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

const logger = createLogger('home');

const HOME_LAYOUT_KEY = 'homeLayout';
const ALWAYS_VISIBLE_SECTIONS = new Set(['user-playlists', 'saved-tracks']);

type SectionStatus = { loading: boolean; error: string | null };
type SectionMode = 'home' | 'search';
type StatusByMode = Record<SectionMode, Record<string, SectionStatus>>;
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

const createSearchOffsets = (): Record<SearchType, number | null> => ({
    track: 0,
    album: 0,
    artist: 0,
    playlist: 0,
    show: 0,
    episode: 0,
    audiobook: 0,
});

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

type HomeViewHeaderProps = {
    heading: { title: string; subtitle: string };
    headingLoading: boolean;
    editing: boolean;
    isEditable: boolean;
    isSearching: boolean;
    availableHomeSections: MediaSectionState[];
    onEditingChange: (next: boolean) => void;
    onAddSection: (id: string) => void;
    onRestore: () => void;
};

function HomeViewHeader({
    heading,
    headingLoading,
    editing,
    isEditable,
    isSearching,
    availableHomeSections,
    onEditingChange,
    onAddSection,
    onRestore,
}: HomeViewHeaderProps) {
    return (
        <Flex
            justify="between"
            direction="column"
            className={clsx('relative min-w-0', isEditable && 'bg-background')}
            ml="-3"
            mr="-1"
            pl="3"
            pr="1"
            py="1"
            mb={isEditable ? '4' : undefined}
        >
            <Flex>
                {!editing && (
                    <SkeletonText
                        loading={headingLoading}
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
                                    disabled={availableHomeSections.length === 0}
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
                                        onSelect={() => onAddSection(section.id)}
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
                                            onClick={onRestore}
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
                            onCheckedChange={onEditingChange}
                            aria-label="Toggle customise mode"
                        />
                    </Flex>
                )}

                {isEditable && (
                    <div className="pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-linear-to-b from-background to-transparent" />
                )}
            </Flex>

            {!isEditable && (
                <SkeletonText
                    loading={headingLoading}
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
}

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
            const saved = await getFromStorage<StoredHomeSection[]>(
                HOME_LAYOUT_KEY
            );
            if (cancelled) return;

            setHomeSections(mergeLayout(saved ?? undefined));
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
                updateStatuses(
                    'search',
                    () =>
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
                updateStatuses(
                    'search',
                    () =>
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
                          ALWAYS_VISIBLE_SECTIONS.has(section.id) ||
                          Boolean(statusById[section.id]?.error)
                  ),
        [activeSections, isEditable, isLoading, statusById]
    );

    return (
        <StickyLayout.Root className="no-overflow-anchor scrollbar-gutter-stable relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="z-30 h-2 shrink-0 bg-background" />
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
                <Flex
                    pl="3"
                    pr="1"
                    pb="2"
                    direction="column"
                    gap="1"
                    className="min-w-0"
                >
                    <DragDropContext
                        onDragEnd={onSectionDragEnd}
                        ignoreSizeLimits
                        disableSecondaryAxisScroll
                        zIndexOptions={{
                            dragging: 20,
                            dropAnimating: 20,
                        }}
                        lockSecondaryAxisMovement
                        clampToVisibleBounds
                    >
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
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
