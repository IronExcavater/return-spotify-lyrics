import { useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DroppableProvided,
    type DropResult,
} from '@hello-pangea/dnd';
import { Flex, DropdownMenu } from '@radix-ui/themes';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import type { MediaItem } from '../../shared/types';
import { buildMediaActions } from '../helpers/mediaActions';
import { buildMediaRouteFromItem } from '../helpers/mediaRoute';
import { createMenuShortcutHandler } from '../helpers/menuShortcuts';
import { useHistory } from '../hooks/useHistory';
import { useScrollFade } from '../hooks/useScrollFade';
import { MediaCard } from './MediaCard';
import { MediaRow } from './MediaRow';

export interface MediaShelfItem extends MediaItem {
    icon?: ReactNode;
    loading?: boolean;
}

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
    onReorder?: (items: MediaShelfItem[]) => void;
    showImage?: boolean;
    cardSize?: 1 | 2 | 3;
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
    item.id ?? `${item.title ?? 'item'}-${index}`;

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
            onReorder(next);
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
                            'pointer-events-none absolute top-0 left-0 z-10 h-full w-2 bg-gradient-to-r from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
                            fade.start ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                    <div
                        className={clsx(
                            'pointer-events-none absolute top-0 right-0 z-10 h-full w-2 bg-gradient-to-l from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
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
                        'pointer-events-none absolute top-0 right-0 left-0 z-10 h-2 bg-gradient-to-b from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
                        fade.start ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
                <div
                    className={clsx(
                        'pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-2 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)]/60 to-transparent transition-opacity duration-200',
                        fade.end ? 'opacity-100' : 'opacity-0'
                    )}
                    aria-hidden
                />
            </>
        );
    };

    const renderItem = useCallback(
        (item: MediaShelfItem, seed: number) => {
            const actions = buildMediaActions(item);
            const hasActions =
                actions.primary.length > 0 || actions.secondary.length > 0;
            const contextMenu = hasActions ? (
                <DropdownMenu.Content
                    align="end"
                    size="1"
                    onKeyDown={createMenuShortcutHandler([
                        ...actions.primary,
                        ...actions.secondary,
                    ])}
                >
                    {actions.primary.map((action) => (
                        <DropdownMenu.Item
                            key={action.id}
                            shortcut={action.shortcut}
                            onSelect={() => action.onSelect()}
                        >
                            {action.label}
                        </DropdownMenu.Item>
                    ))}
                    {actions.primary.length > 0 &&
                        actions.secondary.length > 0 && (
                            <DropdownMenu.Separator />
                        )}
                    {actions.secondary.map((action) => (
                        <DropdownMenu.Item
                            key={action.id}
                            shortcut={action.shortcut}
                            onSelect={() => action.onSelect()}
                        >
                            {action.label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            ) : null;

            const route = buildMediaRouteFromItem(item);
            const handleNavigate = () => {
                if (!route) return;
                routeHistory.goTo('/media', route);
            };

            if (variant === 'tile')
                return (
                    <MediaCard
                        title={item.title}
                        subtitle={item.subtitle}
                        imageUrl={item.imageUrl}
                        icon={item.icon ?? <MdMusicNote />}
                        contextMenu={contextMenu}
                        seed={seed}
                        loading={item.loading}
                        cardSize={cardSize}
                        onClick={
                            item.loading || !route ? undefined : handleNavigate
                        }
                    />
                );

            return (
                <MediaRow
                    title={item.title}
                    subtitle={item.subtitle}
                    icon={item.icon ?? <MdMusicNote />}
                    imageUrl={item.imageUrl}
                    showImage={showImage}
                    contextMenu={contextMenu}
                    seed={seed}
                    loading={item.loading}
                    onClick={
                        item.loading || !route ? undefined : handleNavigate
                    }
                    style={
                        orientation === 'horizontal' && effectiveColumnWidth
                            ? { minWidth: effectiveColumnWidth }
                            : undefined
                    }
                />
            );
        },
        [effectiveColumnWidth, orientation, routeHistory, variant]
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
                              }
                            : { flex: '0 0 auto' }
                    }
                >
                    {col.map((item, idx) => {
                        const flatIndex = colIndex * itemsPerColumn + idx;
                        const key = getItemKey(item, flatIndex);
                        const seed = hashId(item.id ?? '') ^ (flatIndex << 1);
                        if (!draggable) {
                            return (
                                <div key={key}>{renderItem(item, seed)}</div>
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
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                    >
                                        {renderItem(item, seed)}
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
            if (!draggable) {
                const key = getItemKey(item, index);
                return <div key={key}>{renderItem(item, seed)}</div>;
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
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                        >
                            {renderItem(item, seed)}
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
                className={clsx(
                    'no-overflow-anchor relative w-full min-w-0 transition-[opacity,filter] duration-200',
                    !interactive && 'pointer-events-none opacity-70',
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
                        ? {
                              maxHeight: fixedHeight,
                              overflowAnchor: 'none',
                          }
                        : { overflowAnchor: 'none' }
                }
                ref={(node) => {
                    if (dropProvided) dropProvided.innerRef(node);
                    scrollRef.current = node;
                }}
            >
                {renderItems()}
                {dropProvided?.placeholder}
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
