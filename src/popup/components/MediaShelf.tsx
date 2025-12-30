import { useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DropResult,
} from '@hello-pangea/dnd';
import { Flex, DropdownMenu } from '@radix-ui/themes';
import clsx from 'clsx';
import { MdMusicNote } from 'react-icons/md';

import { MediaCard } from './MediaCard';
import { MediaRow } from './MediaRow';

export interface MediaShelfItem {
    id: string;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    imageUrl?: string;
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
    maxVisible?: number;
    fixedHeight?: number;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    itemLoading?: boolean;
    className?: string;
    onReorder?: (items: MediaShelfItem[]) => void;
}

const hashId = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
        h = (h << 5) - h + value.charCodeAt(i);
        h |= 0;
    }
    return h >>> 0;
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
    maxVisible,
    fixedHeight,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    itemLoading = false,
    className,
    onReorder,
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

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

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

    const renderItem = useCallback(
        (item: MediaShelfItem, seed: number) => {
            const contextMenu = (
                <DropdownMenu.Content align="end" size="1">
                    <DropdownMenu.Item>Play next</DropdownMenu.Item>
                    <DropdownMenu.Item>Add to queue</DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item>Go to artist</DropdownMenu.Item>
                </DropdownMenu.Content>
            );

            if (variant === 'tile')
                return (
                    <MediaCard
                        title={item.title}
                        subtitle={item.subtitle}
                        imageUrl={item.imageUrl}
                        icon={item.icon ?? <MdMusicNote />}
                        width="100%"
                        contextMenu={contextMenu}
                        seed={seed}
                        loading={item.loading}
                    />
                );

            return (
                <MediaRow
                    title={item.title}
                    subtitle={item.subtitle}
                    icon={item.icon ?? <MdMusicNote />}
                    imageUrl={item.imageUrl}
                    contextMenu={contextMenu}
                    seed={seed}
                    loading={item.loading}
                />
            );
        },
        [variant]
    );

    const body = (
        <Droppable
            droppableId={droppableId}
            isDropDisabled={!draggable}
            direction={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        >
            {(dropProvided) => (
                <Flex
                    direction={orientation === 'horizontal' ? 'row' : 'column'}
                    gap="1"
                    wrap="nowrap"
                    {...dropProvided.droppableProps}
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
                            ? { maxHeight: fixedHeight, overflowAnchor: 'none' }
                            : { overflowAnchor: 'none' }
                    }
                    ref={(node) => {
                        dropProvided.innerRef(node);
                        scrollRef.current = node;
                    }}
                >
                    {orientation === 'horizontal'
                        ? columns.map((col, colIndex) => (
                              <Flex
                                  key={`col-${colIndex}`}
                                  direction="column"
                                  gap="1"
                                  className="min-w-0"
                                  style={{ flex: '0 0 auto' }}
                              >
                                  {col.map((item, idx) => {
                                      const seed =
                                          hashId(item.id ?? '') ^
                                          ((colIndex * itemsPerColumn + idx) <<
                                              1);
                                      const flatIndex =
                                          colIndex * itemsPerColumn + idx;
                                      return (
                                          <Draggable
                                              key={item.id}
                                              draggableId={item.id}
                                              index={flatIndex}
                                              isDragDisabled={!draggable}
                                          >
                                              {(dragProvided) => (
                                                  <div
                                                      ref={
                                                          dragProvided.innerRef
                                                      }
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
                          ))
                        : visibleItems.map((item, index) => {
                              const seed = hashId(item.id ?? '') ^ (index << 1);
                              return (
                                  <Draggable
                                      key={item.id}
                                      draggableId={item.id}
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
                          })}
                    {dropProvided.placeholder}
                    {loadingMore && (
                        <div
                            className={clsx(
                                'pointer-events-none absolute drop-shadow-sm',
                                orientation === 'horizontal'
                                    ? 'right-2 bottom-2'
                                    : 'right-2 bottom-2'
                            )}
                        >
                            <div className="flex items-center gap-2 rounded-full bg-[var(--color-panel-solid)] px-2 py-[6px] text-[11px] text-[var(--gray-12)] shadow">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-9)]" />
                                Loading more
                            </div>
                        </div>
                    )}
                    <div
                        ref={sentinelRef}
                        aria-hidden
                        className={clsx(
                            orientation === 'horizontal'
                                ? 'h-full w-px'
                                : 'h-px w-full'
                        )}
                    />
                </Flex>
            )}
        </Droppable>
    );

    if (!draggable) return body;

    return <DragDropContext onDragEnd={handleDragEnd}>{body}</DragDropContext>;
}
