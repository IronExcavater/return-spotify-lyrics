import {
    type CSSProperties,
    Fragment,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DraggableProvided,
    type DroppableProvided,
    type DropResult,
} from '@hello-pangea/dnd';
import { Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';
import type { MediaActionGroup, MediaItem } from '../../shared/types';
import { useHistory } from '../hooks/useHistory';
import { buildMediaActions } from '../hooks/useMediaActions';
import { buildMediaNavigationFromItem } from '../hooks/useMediaRoute';
import { useScrollFade } from '../hooks/useScrollFade';
import { useShelfNavigation } from '../hooks/useShelfNavigation';
import { MediaActionsMenu } from './MediaActionsMenu';
import { MediaCard } from './MediaCard';
import { MediaRow, type MediaRowProps } from './MediaRow';
import { TextButton } from './TextButton';

export interface MediaShelfItem extends MediaItem {
    icon?: ReactNode;
    loading?: boolean;
    listKey?: string;
}
type TrackSubtitleMode = 'artist' | 'artist-album' | 'artists';
interface Props {
    droppableId?: string;
    interactive?: boolean;
    items: MediaShelfItem[];
    draggable?: boolean;
    orientation?: 'vertical' | 'horizontal';
    variant?: 'list' | 'tile';
    itemsPerColumn?: number;
    wideColumns?: boolean;
    columnWidth?: number;
    maxVisible?: number;
    fixedHeight?: number;
    totalCount?: number;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    itemLoading?: boolean;
    className?: string;
    onReorder?: (
        items: MediaShelfItem[],
        context?: { sourceIndex: number; destinationIndex: number }
    ) => void;
    showImage?: boolean;
    cardSize?: 1 | 2 | 3;
    trackSubtitleMode?: TrackSubtitleMode;
    getActions?: (
        item: MediaShelfItem,
        index: number
    ) => MediaActionGroup | null;
    getRowProps?: (
        item: MediaShelfItem,
        index: number
    ) => Partial<
        Pick<
            MediaRowProps,
            'showPosition' | 'position' | 'selection' | 'className'
        >
    >;
}
const hashId = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
        h = (h << 5) - h + value.charCodeAt(i);
        h |= 0;
    }
    return h >>> 0;
};
const getItemKey = (item: MediaShelfItem, index: number) =>
    item.listKey ?? item.id ?? `${item.title ?? 'item'}-${index}`;
const LOADING_LABEL = '\u00A0';
const MAX_LOADING_ITEMS = 48;
const DEFAULT_VERTICAL_LOADING_COUNT = 14;
const DEFAULT_HORIZONTAL_LOADING_COLUMNS = {
    list: 4,
    tile: 6,
} as const;

const getLoadingPlaceholderCount = ({
    itemCount,
    totalCount,
    orientation,
    variant,
    itemsPerColumn,
    maxVisible,
}: {
    itemCount: number;
    totalCount?: number;
    orientation: 'vertical' | 'horizontal';
    variant: 'list' | 'tile';
    itemsPerColumn: number;
    maxVisible?: number;
}) => {
    if (itemCount > 0) return itemCount;
    if (typeof totalCount === 'number' && totalCount > 0) {
        return Math.min(totalCount, MAX_LOADING_ITEMS);
    }
    if (orientation === 'horizontal') {
        const columns =
            maxVisible ?? DEFAULT_HORIZONTAL_LOADING_COLUMNS[variant];
        return Math.max(
            6,
            Math.min(columns * Math.max(1, itemsPerColumn), MAX_LOADING_ITEMS)
        );
    }
    return Math.max(
        6,
        Math.min(
            maxVisible ?? DEFAULT_VERTICAL_LOADING_COUNT,
            MAX_LOADING_ITEMS
        )
    );
};

function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
    let current: HTMLElement | null = node;
    while (current) {
        const style = getComputedStyle(current);
        const { overflowY, overflowX, overflow } = style;
        if (
            overflowY === 'auto' ||
            overflowY === 'scroll' ||
            overflowX === 'auto' ||
            overflowX === 'scroll' ||
            overflow === 'auto' ||
            overflow === 'scroll'
        )
            return current;
        current = current.parentElement;
    }
    return window;
}
export function MediaShelf({
    items,
    interactive = true,
    droppableId = 'media-shelf',
    draggable = false,
    orientation = 'vertical',
    variant = 'list',
    itemsPerColumn = 6,
    columnWidth,
    maxVisible,
    fixedHeight,
    totalCount,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    itemLoading = false,
    className,
    onReorder,
    showImage = true,
    cardSize,
    trackSubtitleMode,
    getActions,
    getRowProps,
}: Props) {
    const createLoadingItem = useCallback(
        (index: number): MediaShelfItem => ({
            id: `loading-${index}`,
            listKey: `loading-${index}`,
            title: LOADING_LABEL,
            subtitle: LOADING_LABEL,
            kind: variant === 'tile' ? 'album' : 'track',
            loading: true,
        }),
        [variant]
    );
    const loadingPlaceholderCount = useMemo(
        () =>
            getLoadingPlaceholderCount({
                itemCount: items.length,
                totalCount,
                orientation,
                variant,
                itemsPerColumn,
                maxVisible,
            }),
        [
            items.length,
            itemsPerColumn,
            maxVisible,
            orientation,
            totalCount,
            variant,
        ]
    );
    const flattened = useMemo(() => {
        if (items.length === 0 && itemLoading) {
            return Array.from({ length: loadingPlaceholderCount }, (_, index) =>
                createLoadingItem(index)
            );
        }
        return items.map((item) =>
            itemLoading ? { ...item, loading: true } : item
        );
    }, [createLoadingItem, itemLoading, items, loadingPlaceholderCount]);
    const visibleItems = useMemo(() => {
        if (maxVisible == null) return flattened;
        const capacity =
            orientation === 'horizontal'
                ? maxVisible * itemsPerColumn
                : maxVisible;
        return flattened.slice(0, capacity);
    }, [flattened, maxVisible, orientation, itemsPerColumn]);
    const [reservedItemHeight, setReservedItemHeight] = useState(52);
    const { scrollRef, fade } = useScrollFade(orientation, [
        items.length,
        visibleItems.length,
        totalCount,
    ]);
    const routeHistory = useHistory();
    const columns = useMemo(() => {
        if (orientation !== 'horizontal' || itemsPerColumn <= 0)
            return [visibleItems];
        const grouped: MediaShelfItem[][] = [];
        visibleItems.forEach((item, idx) => {
            const colIndex = Math.floor(idx / itemsPerColumn);
            if (!grouped[colIndex]) grouped[colIndex] = [];
            grouped[colIndex].push(item);
        });
        return grouped;
    }, [visibleItems, orientation, itemsPerColumn]);
    const effectiveColumnWidth =
        variant === 'list' ? (columnWidth ?? 300) : undefined;
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const {
        focusRefs,
        activeIndex,
        handleItemFocus,
        handleContainerFocusCapture,
        handleContainerKeyDown,
        handleItemKeyDown,
    } = useShelfNavigation({
        containerRef: scrollRef,
        itemCount: visibleItems.length,
        orientation,
        itemsPerColumn,
        interactive,
    });
    const lastItemsRef = useRef<{
        firstId: string | null;
        length: number;
        loading: boolean;
    } | null>(null);

    const capacity = useMemo(() => {
        if (maxVisible == null) return Number.POSITIVE_INFINITY;
        return orientation === 'horizontal'
            ? maxVisible * itemsPerColumn
            : maxVisible;
    }, [maxVisible, orientation, itemsPerColumn]);
    const reachedLimit = visibleItems.length >= capacity;
    const canVirtualizeList =
        orientation === 'vertical' && variant === 'list' && maxVisible == null;
    const renderableItemCount = canVirtualizeList
        ? Math.max(visibleItems.length, totalCount ?? visibleItems.length)
        : visibleItems.length;
    const shouldVirtualize = canVirtualizeList && renderableItemCount > 48;
    const isVirtualDroppable = shouldVirtualize && draggable;
    const offscreenItemStyle: CSSProperties | undefined =
        !shouldVirtualize &&
        orientation === 'vertical' &&
        variant === 'list' &&
        !draggable
            ? {
                  contentVisibility: 'auto',
                  containIntrinsicSize: `${reservedItemHeight}px`,
              }
            : undefined;
    const [virtualRange, setVirtualRange] = useState(() => ({
        start: 0,
        end: renderableItemCount,
    }));
    const getRenderableItem = useCallback(
        (index: number) => {
            const item = visibleItems[index] ?? createLoadingItem(index);
            return {
                item,
                index,
                loaded: index < visibleItems.length,
            };
        },
        [createLoadingItem, visibleItems]
    );
    const renderedVerticalItems = useMemo(
        () =>
            shouldVirtualize
                ? Array.from(
                      {
                          length: Math.max(
                              0,
                              virtualRange.end - virtualRange.start
                          ),
                      },
                      (_, offset) =>
                          getRenderableItem(virtualRange.start + offset)
                  )
                : Array.from({ length: renderableItemCount }, (_, index) =>
                      getRenderableItem(index)
                  ),
        [
            getRenderableItem,
            renderableItemCount,
            shouldVirtualize,
            virtualRange.end,
            virtualRange.start,
        ]
    );
    const topVirtualSpaceHeight = shouldVirtualize
        ? virtualRange.start * reservedItemHeight
        : 0;
    const bottomVirtualSpaceHeight = shouldVirtualize
        ? Math.max(0, renderableItemCount - virtualRange.end) *
          reservedItemHeight
        : 0;

    useEffect(() => {
        if (!canVirtualizeList) return;
        const node = scrollRef.current;
        if (!node) return;
        const sample = node.querySelector<HTMLElement>(
            '[data-media-shelf-item]'
        );
        if (!sample) return;
        const nextHeight = Math.ceil(sample.getBoundingClientRect().height);
        if (!nextHeight) return;
        setReservedItemHeight((previous) =>
            previous === nextHeight ? previous : nextHeight
        );
    }, [
        canVirtualizeList,
        renderableItemCount,
        shouldVirtualize,
        visibleItems.length,
    ]);

    useEffect(() => {
        if (!shouldVirtualize) {
            setVirtualRange({ start: 0, end: renderableItemCount });
            return;
        }

        const node = scrollRef.current;
        if (!node) return;

        const root = getScrollParent(node);
        const scrollTarget = root instanceof Window ? window : root;
        const overscanPx = reservedItemHeight * 8;

        const updateRange = () => {
            const listRect = node.getBoundingClientRect();
            const rootRect =
                root instanceof Window
                    ? {
                          top: 0,
                          bottom: window.innerHeight,
                      }
                    : root.getBoundingClientRect();
            const visibleTop = Math.max(
                0,
                Math.min(listRect.height, rootRect.top - listRect.top)
            );
            const visibleBottom = Math.max(
                0,
                Math.min(listRect.height, rootRect.bottom - listRect.top)
            );
            const nextStart = Math.max(
                0,
                Math.floor((visibleTop - overscanPx) / reservedItemHeight)
            );
            const nextEnd = Math.min(
                renderableItemCount,
                Math.max(
                    nextStart + 1,
                    Math.ceil((visibleBottom + overscanPx) / reservedItemHeight)
                )
            );
            setVirtualRange((previous) =>
                previous.start === nextStart && previous.end === nextEnd
                    ? previous
                    : { start: nextStart, end: nextEnd }
            );
        };
        const resizeObserver = new ResizeObserver(updateRange);

        updateRange();
        scrollTarget.addEventListener('scroll', updateRange, { passive: true });
        window.addEventListener('resize', updateRange);
        resizeObserver.observe(node);
        if (!(root instanceof Window)) resizeObserver.observe(root);

        return () => {
            scrollTarget.removeEventListener('scroll', updateRange);
            window.removeEventListener('resize', updateRange);
            resizeObserver.disconnect();
        };
    }, [renderableItemCount, reservedItemHeight, shouldVirtualize]);

    useEffect(() => {
        if (!shouldVirtualize) return;
        const scope = scrollRef.current;
        const activeElement = document.activeElement;
        const shelfHasFocus =
            scope &&
            activeElement instanceof Node &&
            scope.contains(activeElement);
        if (!shelfHasFocus) return;
        if (
            activeIndex >= virtualRange.start &&
            activeIndex < virtualRange.end
        ) {
            focusRefs.current[activeIndex]?.focus();
            return;
        }
        const overscanCount = 8;
        const nextStart = Math.max(0, activeIndex - overscanCount);
        const nextEnd = Math.min(
            renderableItemCount,
            Math.max(nextStart + 1, activeIndex + overscanCount + 1)
        );
        setVirtualRange((previous) =>
            previous.start === nextStart && previous.end === nextEnd
                ? previous
                : { start: nextStart, end: nextEnd }
        );
    }, [
        activeIndex,
        focusRefs,
        scrollRef,
        shouldVirtualize,
        virtualRange.end,
        virtualRange.start,
        renderableItemCount,
    ]);

    useEffect(() => {
        if (
            !shouldVirtualize ||
            !onLoadMore ||
            !hasMore ||
            loadingMore ||
            reachedLimit
        ) {
            return;
        }
        const preloadCount = 12;
        if (
            virtualRange.end >= Math.max(1, visibleItems.length - preloadCount)
        ) {
            onLoadMore();
        }
    }, [
        hasMore,
        loadingMore,
        onLoadMore,
        reachedLimit,
        shouldVirtualize,
        virtualRange.end,
        visibleItems.length,
    ]);
    useEffect(() => {
        if (
            shouldVirtualize ||
            !onLoadMore ||
            !hasMore ||
            loadingMore ||
            reachedLimit
        ) {
            return;
        }
        const rootEl = getScrollParent(scrollRef.current);
        const observer = new IntersectionObserver(
            (entries) => {
                if (loadingMore || !hasMore || reachedLimit) return;
                if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
            },
            {
                root: rootEl instanceof Window ? null : rootEl,
                rootMargin:
                    orientation === 'horizontal'
                        ? '0px 120px 0px 0px'
                        : '0px 0px 120px 0px',
            }
        );
        const node = sentinelRef.current;
        if (node) observer.observe(node);
        return () => observer.disconnect();
    }, [
        hasMore,
        loadingMore,
        onLoadMore,
        orientation,
        itemsPerColumn,
        maxVisible,
        reachedLimit,
        shouldVirtualize,
    ]);
    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;
            if (!onReorder) return;
            const next = [...flattened];
            const [moved] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, moved);
            onReorder(next, {
                sourceIndex: result.source.index,
                destinationIndex: result.destination.index,
            });
        },
        [flattened, onReorder]
    );
    useEffect(() => {
        const node = scrollRef.current;
        if (!node) return;
        const firstId = visibleItems[0]?.id ?? null;
        const loading = Boolean(visibleItems[0]?.loading);
        const prev = lastItemsRef.current;
        lastItemsRef.current = {
            firstId,
            length: visibleItems.length,
            loading,
        };
        if (!prev) return;
        if (prev.loading || loading) return;
        const replaced = prev.firstId !== firstId;
        const shrunk = visibleItems.length < prev.length;
        if (!replaced && !shrunk) return;
        if (orientation === 'horizontal') node.scrollLeft = 0;
        else node.scrollTop = 0;
    }, [orientation, visibleItems]);
    const renderFades = () => {
        if (orientation === 'horizontal') {
            return (
                <>
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-0 left-0 z-10 h-full w-2 bg-linear-to-r to-transparent transition-opacity',
                            fade.start ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-0 right-0 z-10 h-full w-2 bg-linear-to-l to-transparent transition-opacity',
                            fade.end ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                </>
            );
        }
        return (
            <>
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute top-0 right-0 left-0 z-10 h-2 bg-linear-to-b to-transparent transition-opacity',
                        fade.start ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
                <div
                    className={clsx(
                        'from-background via-background/60 pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-2 bg-linear-to-t to-transparent transition-opacity',
                        fade.end ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
            </>
        );
    };
    const renderItem = useCallback(
        (item: MediaShelfItem, seed: number, index: number) => {
            const renderArtistLinks = (
                artists: MediaShelfItem['artists'],
                limit?: number
            ) => {
                if (!artists || artists.length === 0) return undefined;
                const entries =
                    limit != null ? artists.slice(0, limit) : artists;
                return entries.map((artist, index) => (
                    <Fragment key={artist.id ?? `${artist.name}-${index}`}>
                        <TextButton
                            size="1"
                            color="gray"
                            interactive={Boolean(artist.id)}
                            onClick={
                                artist.id
                                    ? (event) => {
                                          event.stopPropagation();
                                          routeHistory.goTo('/media', {
                                              kind: 'artist',
                                              id: artist.id!,
                                          });
                                      }
                                    : undefined
                            }
                        >
                            {artist.name}
                        </TextButton>
                        {index < entries.length - 1 && (
                            <Text as="span" size="1" color="gray">
                                {',\u00A0'}
                            </Text>
                        )}
                    </Fragment>
                ));
            };
            const resolveTrackSubtitle = (
                trackItem: MediaShelfItem,
                mode: TrackSubtitleMode
            ) => {
                const artists = trackItem.artists;
                const fallbackArtists = trackItem.subtitle ?? '';
                const firstArtist =
                    artists?.[0]?.name ??
                    fallbackArtists.split(',')[0]?.trim() ??
                    fallbackArtists;
                const albumName =
                    trackItem.parentIsSingle ||
                    (trackItem.parentTitle &&
                        trackItem.parentTitle.toLowerCase() ===
                            trackItem.title?.toLowerCase())
                        ? undefined
                        : trackItem.parentTitle;
                const albumOnClick = trackItem.parentId
                    ? () =>
                          routeHistory.goTo('/media', {
                              kind: 'album',
                              id: trackItem.parentId!,
                          })
                    : undefined;
                if (mode === 'artists') {
                    return (
                        renderArtistLinks(artists) ||
                        fallbackArtists ||
                        undefined
                    );
                }
                if (mode === 'artist-album') {
                    if (!firstArtist && !albumName) return undefined;
                    return (
                        <>
                            {renderArtistLinks(artists, 1) ??
                                (firstArtist ? (
                                    <Text as="span" size="1" color="gray">
                                        {firstArtist}
                                    </Text>
                                ) : null)}
                            {firstArtist && albumName && (
                                <Text as="span" size="1" color="gray">
                                    {'\u00A0•\u00A0'}
                                </Text>
                            )}
                            {albumName &&
                                (albumOnClick ? (
                                    <TextButton
                                        size="1"
                                        color="gray"
                                        onClick={albumOnClick}
                                    >
                                        {albumName}
                                    </TextButton>
                                ) : (
                                    <Text as="span" size="1" color="gray">
                                        {albumName}
                                    </Text>
                                ))}
                        </>
                    );
                }
                return (
                    renderArtistLinks(artists, 1) ||
                    (firstArtist ? (
                        <Text as="span" size="1" color="gray">
                            {firstArtist}
                        </Text>
                    ) : undefined)
                );
            };
            const mode =
                trackSubtitleMode ??
                (variant === 'tile' ? 'artist' : 'artist-album');
            const subtitle =
                item.kind === 'track'
                    ? resolveTrackSubtitle(item, mode)
                    : (renderArtistLinks(item.artists) ?? item.subtitle);
            const actions =
                getActions?.(item, index) ?? buildMediaActions(item);
            const rowProps = getRowProps?.(item, index);
            const resolvedPosition =
                rowProps?.position ?? (item.loading ? index : undefined);
            const hasActions =
                actions.primary.length > 0 || actions.secondary.length > 0;
            const contextMenu =
                hasActions || item.kind === 'track' ? (
                    <MediaActionsMenu actions={actions} item={item} />
                ) : null;
            const navigation = buildMediaNavigationFromItem(item);
            const handleNavigate = () => {
                if (!navigation) return;
                routeHistory.goTo(navigation.path, navigation.state);
            };
            const canActivate = !item.loading && Boolean(navigation);
            const content =
                variant === 'tile' ? (
                    <MediaCard
                        title={item.title}
                        subtitle={subtitle}
                        imageUrl={item.imageUrl}
                        icon={item.icon ?? <MdMusicNote />}
                        contextMenu={contextMenu}
                        contextMenuDisabled={false}
                        seed={seed}
                        loading={item.loading}
                        cardSize={cardSize}
                        onClick={canActivate ? handleNavigate : undefined}
                    />
                ) : (
                    <MediaRow
                        title={item.title}
                        subtitle={subtitle}
                        icon={item.icon ?? <MdMusicNote />}
                        imageUrl={item.imageUrl}
                        showImage={showImage}
                        contextMenu={contextMenu}
                        contextMenuDisabled={false}
                        seed={seed}
                        loading={item.loading}
                        onClick={canActivate ? handleNavigate : undefined}
                        showPosition={rowProps?.showPosition}
                        position={resolvedPosition}
                        selection={rowProps?.selection}
                        className={rowProps?.className}
                        style={
                            orientation === 'horizontal' && effectiveColumnWidth
                                ? { minWidth: effectiveColumnWidth }
                                : undefined
                        }
                    />
                );
            return { content, canActivate, handleNavigate };
        },
        [
            cardSize,
            effectiveColumnWidth,
            getActions,
            getRowProps,
            orientation,
            routeHistory,
            showImage,
            trackSubtitleMode,
            variant,
        ]
    );
    const renderItemShell = useCallback(
        ({
            item,
            index,
            loaded,
            dragProvided,
            isClone = false,
        }: {
            item: MediaShelfItem;
            index: number;
            loaded: boolean;
            dragProvided?: DraggableProvided;
            isClone?: boolean;
        }) => {
            const seed = hashId(item.id ?? '') ^ (index << 1);
            const { content, canActivate, handleNavigate } = renderItem(
                item,
                seed,
                index
            );
            const draggableProps = dragProvided?.draggableProps;
            const dragHandleProps = dragProvided?.dragHandleProps ?? undefined;
            const cloneWidth = isClone
                ? (focusRefs.current[index]?.getBoundingClientRect().width ??
                  scrollRef.current?.getBoundingClientRect().width)
                : undefined;

            return (
                <div
                    key={getItemKey(item, index)}
                    ref={(node) => {
                        if (dragProvided) dragProvided.innerRef(node);
                        if (isClone) return;
                        focusRefs.current[index] = node;
                    }}
                    data-index={index}
                    {...draggableProps}
                    {...dragHandleProps}
                    style={{
                        ...(cloneWidth
                            ? {
                                  width: cloneWidth,
                                  maxWidth: cloneWidth,
                                  boxSizing: 'border-box',
                              }
                            : undefined),
                        ...draggableProps?.style,
                        ...(!dragProvided ? offscreenItemStyle : undefined),
                    }}
                    role="button"
                    aria-disabled={!canActivate}
                    data-media-shelf-item="true"
                    className={clsx(
                        'group rounded-2 bg-background focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
                        dragProvided &&
                            loaded &&
                            'cursor-grab active:cursor-grabbing'
                    )}
                    tabIndex={
                        !isClone &&
                        interactive &&
                        loaded &&
                        index === activeIndex
                            ? 0
                            : -1
                    }
                    onFocus={
                        !isClone && loaded
                            ? (event) => handleItemFocus(event, index)
                            : undefined
                    }
                    onKeyDown={
                        !isClone && loaded
                            ? (event) =>
                                  handleItemKeyDown(
                                      event,
                                      index,
                                      canActivate,
                                      handleNavigate
                                  )
                            : undefined
                    }
                >
                    {content}
                </div>
            );
        },
        [
            activeIndex,
            focusRefs,
            handleItemFocus,
            handleItemKeyDown,
            interactive,
            offscreenItemStyle,
            renderItem,
        ]
    );
    const renderItems = () => {
        if (orientation === 'horizontal') {
            return columns.map((col, colIndex) => (
                <Flex
                    key={`col-${colIndex}`}
                    direction="column"
                    gap="1"
                    className="min-w-0"
                    style={
                        effectiveColumnWidth
                            ? {
                                  flexGrow: 0,
                                  flexShrink: 0,
                                  width: effectiveColumnWidth,
                                  flexBasis: effectiveColumnWidth,
                              }
                            : { flexGrow: 0, flexShrink: 0 }
                    }
                >
                    {col.map((item, idx) => {
                        const flatIndex = colIndex * itemsPerColumn + idx;
                        const key = getItemKey(item, flatIndex);
                        return (
                            <Draggable
                                key={key}
                                draggableId={key}
                                index={flatIndex}
                                isDragDisabled={!draggable}
                                disableInteractiveElementBlocking
                            >
                                {(dragProvided) =>
                                    renderItemShell({
                                        item,
                                        index: flatIndex,
                                        loaded: true,
                                        dragProvided,
                                    })
                                }
                            </Draggable>
                        );
                    })}
                </Flex>
            ));
        }

        if (shouldVirtualize) {
            return renderedVerticalItems.map(({ item, index, loaded }) => {
                if (!loaded || !draggable) {
                    return renderItemShell({
                        item,
                        index,
                        loaded,
                    });
                }

                return (
                    <Draggable
                        key={getItemKey(item, index)}
                        draggableId={getItemKey(item, index)}
                        index={index}
                        disableInteractiveElementBlocking
                    >
                        {(dragProvided) =>
                            renderItemShell({
                                item,
                                index,
                                loaded,
                                dragProvided,
                            })
                        }
                    </Draggable>
                );
            });
        }

        const loadedItems = renderedVerticalItems
            .filter(({ loaded }) => loaded)
            .map(({ item, index }) =>
                draggable ? (
                    <Draggable
                        key={getItemKey(item, index)}
                        draggableId={getItemKey(item, index)}
                        index={index}
                        isDragDisabled={false}
                        disableInteractiveElementBlocking
                    >
                        {(dragProvided) =>
                            renderItemShell({
                                item,
                                index,
                                loaded: true,
                                dragProvided,
                            })
                        }
                    </Draggable>
                ) : (
                    renderItemShell({
                        item,
                        index,
                        loaded: true,
                    })
                )
            );
        const loadingItems = renderedVerticalItems
            .filter(({ loaded }) => !loaded)
            .map(({ item, index }) =>
                renderItemShell({
                    item,
                    index,
                    loaded: false,
                })
            );

        return (
            <>
                {loadedItems}
                <div
                    ref={sentinelRef}
                    aria-hidden
                    className="h-px w-full flex-none"
                />
                {loadingItems}
            </>
        );
    };
    const renderVirtualClone = useCallback(
        (
            dragProvided: DraggableProvided,
            _snapshot: unknown,
            rubric: { source: { index: number } }
        ) => {
            const item = visibleItems[rubric.source.index];
            if (!item) return null;
            return renderItemShell({
                item,
                index: rubric.source.index,
                loaded: true,
                dragProvided,
                isClone: true,
            });
        },
        [renderItemShell, visibleItems]
    );
    const renderBody = (dropProvided?: DroppableProvided) => (
        <Flex className="relative -mx-1">
            <Flex
                direction={orientation === 'horizontal' ? 'row' : 'column'}
                gap="1"
                wrap="nowrap"
                {...(dropProvided?.droppableProps ?? {})}
                onFocusCapture={handleContainerFocusCapture}
                onKeyDownCapture={handleContainerKeyDown}
                className={clsx(
                    'no-overflow-anchor relative w-full p-1 transition-[opacity,filter]',
                    !interactive && 'pointer-events-none opacity-70',
                    orientation !== 'horizontal' && 'scrollbar-gutter-stable',
                    orientation === 'horizontal'
                        ? fixedHeight
                            ? 'overflow-x-auto overflow-y-hidden'
                            : 'overflow-x-auto overflow-y-visible'
                        : fixedHeight
                          ? 'overflow-y-auto'
                          : 'overflow-visible',
                    className
                )}
                style={
                    fixedHeight
                        ? { maxHeight: fixedHeight, overflowAnchor: 'none' }
                        : { overflowAnchor: 'none' }
                }
                ref={(node) => {
                    if (dropProvided) dropProvided.innerRef(node);
                    scrollRef.current = node;
                }}
            >
                {shouldVirtualize && topVirtualSpaceHeight > 0 && (
                    <div
                        aria-hidden
                        className="w-full flex-none"
                        style={{ height: topVirtualSpaceHeight }}
                    />
                )}
                {renderItems()}
                {!isVirtualDroppable && dropProvided?.placeholder}
                {shouldVirtualize && bottomVirtualSpaceHeight > 0 && (
                    <div
                        aria-hidden
                        className="w-full flex-none"
                        style={{ height: bottomVirtualSpaceHeight }}
                    />
                )}
                {orientation === 'horizontal' && (
                    <div
                        ref={sentinelRef}
                        aria-hidden
                        className="h-full w-px flex-none"
                    />
                )}
            </Flex>
            {renderFades()}
        </Flex>
    );
    return (
        <DragDropContext
            onDragEnd={handleDragEnd}
            disableSecondaryAxisScroll
            lockSecondaryAxisMovement
            clampToVisibleBounds
        >
            <Droppable
                droppableId={droppableId}
                isDropDisabled={!draggable}
                mode={isVirtualDroppable ? 'virtual' : 'standard'}
                direction={
                    orientation === 'horizontal' ? 'horizontal' : 'vertical'
                }
                renderClone={isVirtualDroppable ? renderVirtualClone : null}
            >
                {(dropProvided) => renderBody(dropProvided)}
            </Droppable>
        </DragDropContext>
    );
}
