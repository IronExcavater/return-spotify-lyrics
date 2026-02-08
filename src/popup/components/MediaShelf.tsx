import {
    Fragment,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
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
import { MediaRow } from './MediaRow';
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
}: Props) {
    const flattened = useMemo(
        () =>
            items.map((item) =>
                itemLoading ? { ...item, loading: true } : item
            ),
        [items, itemLoading]
    );
    const visibleItems = useMemo(() => {
        if (maxVisible == null) return flattened;
        const capacity =
            orientation === 'horizontal'
                ? maxVisible * itemsPerColumn
                : maxVisible;
        return flattened.slice(0, capacity);
    }, [flattened, maxVisible, orientation, itemsPerColumn]);
    const { scrollRef, fade } = useScrollFade(orientation, [
        items.length,
        visibleItems.length,
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
    } | null>(null);

    const capacity = useMemo(() => {
        if (maxVisible == null) return Number.POSITIVE_INFINITY;
        return orientation === 'horizontal'
            ? maxVisible * itemsPerColumn
            : maxVisible;
    }, [maxVisible, orientation, itemsPerColumn]);
    const reachedLimit = visibleItems.length >= capacity;

    useEffect(() => {
        if (!onLoadMore || !hasMore || loadingMore || reachedLimit) return;
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
        visibleItems.length,
        reachedLimit,
    ]);
    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination || !onReorder) return;
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
        const firstId = items[0]?.id ?? null;
        const prev = lastItemsRef.current;
        lastItemsRef.current = { firstId, length: items.length };
        if (!prev) return;
        const replaced = prev.firstId !== firstId;
        const shrunk = items.length < prev.length;
        if (!replaced && !shrunk) return;
        if (orientation === 'horizontal') node.scrollLeft = 0;
        else node.scrollTop = 0;
    }, [items, orientation]);
    const renderFades = () => {
        if (orientation === 'horizontal') {
            return (
                <>
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-0 -left-1 z-10 h-full w-2 bg-linear-to-r to-transparent transition-opacity',
                            fade.start ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-0 right-1 z-10 h-full w-2 bg-linear-to-l to-transparent transition-opacity',
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
            const hasActions =
                actions.primary.length > 0 || actions.secondary.length > 0;
            const contextMenu = hasActions ? (
                <MediaActionsMenu actions={actions} />
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
                        seed={seed}
                        loading={item.loading}
                        onClick={canActivate ? handleNavigate : undefined}
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
            orientation,
            routeHistory,
            showImage,
            trackSubtitleMode,
            variant,
        ]
    );
    const renderItems = () => {
        if (orientation === 'horizontal') {
            return columns.map((col, colIndex) => (
                <Flex
                    key={`col-${colIndex}`}
                    direction="column"
                    gap="1"
                    className={clsx(
                        'min-w-0',
                        variant === 'list' && 'flex-none'
                    )}
                    style={
                        effectiveColumnWidth
                            ? {
                                  flex: '0 0 auto',
                                  width: effectiveColumnWidth,
                                  flexBasis: effectiveColumnWidth,
                              }
                            : { flex: '0 0 auto' }
                    }
                >
                    {col.map((item, idx) => {
                        const flatIndex = colIndex * itemsPerColumn + idx;
                        const key = getItemKey(item, flatIndex);
                        const seed = hashId(item.id ?? '') ^ (flatIndex << 1);
                        const { content, canActivate, handleNavigate } =
                            renderItem(item, seed, flatIndex);
                        if (!draggable) {
                            return (
                                <div
                                    key={key}
                                    ref={(node) => {
                                        focusRefs.current[flatIndex] = node;
                                    }}
                                    data-index={flatIndex}
                                    role="button"
                                    aria-disabled={!canActivate}
                                    className="group rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                                    tabIndex={
                                        interactive && flatIndex === activeIndex
                                            ? 0
                                            : -1
                                    }
                                    onFocus={(event) =>
                                        handleItemFocus(event, flatIndex)
                                    }
                                    onKeyDown={(event) =>
                                        handleItemKeyDown(
                                            event,
                                            flatIndex,
                                            canActivate,
                                            handleNavigate
                                        )
                                    }
                                >
                                    {content}
                                </div>
                            );
                        }
                        return (
                            <Draggable
                                key={key}
                                draggableId={key}
                                index={flatIndex}
                                isDragDisabled={!draggable}
                            >
                                {(dragProvided) => (
                                    <div
                                        ref={(node) => {
                                            dragProvided.innerRef(node);
                                            focusRefs.current[flatIndex] = node;
                                        }}
                                        data-index={flatIndex}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        style={{
                                            ...dragProvided.draggableProps
                                                .style,
                                        }}
                                        role="button"
                                        aria-disabled={!canActivate}
                                        className="group rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                                        tabIndex={
                                            interactive &&
                                            flatIndex === activeIndex
                                                ? 0
                                                : -1
                                        }
                                        onFocus={(event) =>
                                            handleItemFocus(event, flatIndex)
                                        }
                                        onKeyDown={(event) =>
                                            handleItemKeyDown(
                                                event,
                                                flatIndex,
                                                canActivate,
                                                handleNavigate
                                            )
                                        }
                                    >
                                        {content}
                                    </div>
                                )}
                            </Draggable>
                        );
                    })}
                </Flex>
            ));
        }
        return visibleItems.map((item, index) => {
            const seed = hashId(item.id ?? '') ^ (index << 1);
            const { content, canActivate, handleNavigate } = renderItem(
                item,
                seed,
                index
            );
            if (!draggable) {
                const key = getItemKey(item, index);
                return (
                    <div
                        key={key}
                        ref={(node) => {
                            focusRefs.current[index] = node;
                        }}
                        data-index={index}
                        role="button"
                        aria-disabled={!canActivate}
                        className="group rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                        tabIndex={interactive && index === activeIndex ? 0 : -1}
                        onFocus={(event) => handleItemFocus(event, index)}
                        onKeyDown={(event) =>
                            handleItemKeyDown(
                                event,
                                index,
                                canActivate,
                                handleNavigate
                            )
                        }
                    >
                        {content}
                    </div>
                );
            }
            return (
                <Draggable
                    key={getItemKey(item, index)}
                    draggableId={getItemKey(item, index)}
                    index={index}
                    isDragDisabled={!draggable}
                >
                    {(dragProvided) => (
                        <div
                            ref={(node) => {
                                dragProvided.innerRef(node);
                                focusRefs.current[index] = node;
                            }}
                            data-index={index}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                                ...dragProvided.draggableProps.style,
                            }}
                            role="button"
                            aria-disabled={!canActivate}
                            className="group rounded-2 focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
                            tabIndex={
                                interactive && index === activeIndex ? 0 : -1
                            }
                            onFocus={(event) => handleItemFocus(event, index)}
                            onKeyDown={(event) =>
                                handleItemKeyDown(
                                    event,
                                    index,
                                    canActivate,
                                    handleNavigate
                                )
                            }
                        >
                            {content}
                        </div>
                    )}
                </Draggable>
            );
        });
    };
    const renderBody = (dropProvided?: DroppableProvided) => (
        <div className="relative">
            <Flex
                direction={orientation === 'horizontal' ? 'row' : 'column'}
                gap="1"
                wrap="nowrap"
                {...(dropProvided?.droppableProps ?? {})}
                onFocusCapture={handleContainerFocusCapture}
                onKeyDownCapture={handleContainerKeyDown}
                className={clsx(
                    'no-overflow-anchor relative -m-1 mb-1 w-full p-1 transition-[opacity,filter]',
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
                {renderItems()} {dropProvided?.placeholder}
                <div
                    ref={sentinelRef}
                    aria-hidden
                    className={clsx(
                        orientation === 'horizontal'
                            ? 'h-full w-px flex-none'
                            : 'h-px w-full flex-none'
                    )}
                />
            </Flex>
            {renderFades()}
        </div>
    );
    if (!draggable) return renderBody();
    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable
                droppableId={droppableId}
                isDropDisabled={!draggable}
                direction={
                    orientation === 'horizontal' ? 'horizontal' : 'vertical'
                }
            >
                {(dropProvided) => renderBody(dropProvided)}
            </Droppable>
        </DragDropContext>
    );
}
