import { type CSSProperties, useCallback, useRef } from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DraggableProvided,
    type DroppableProvided,
    type DropResult,
} from '@hello-pangea/dnd';
import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { usePremiumPlaybackBlocked } from '../../data/playbackAccess';
import { useHistory } from '../../hooks/useHistory';
import { useScrollFade } from '../../hooks/useScrollFade';
import { useShelfNavigation } from '../../hooks/useShelfNavigation';
import type { MediaShelfItem } from '../../types/mediaShelf';
import { buildShelfItemView } from './shelf/itemView';
import { getShelfItemKey, hashShelfItemId } from './shelf/layout';
import { ShelfFades } from './shelf/ShelfFades';
import type { MediaShelfProps } from './shelf/types';
import { useShelfItems } from './shelf/useShelfItems';
import { useShelfPaginationObserver } from './shelf/useShelfPaginationObserver';
import { useShelfScrollReset } from './shelf/useShelfScrollReset';
import { useVirtualShelfRange } from './shelf/useVirtualShelfRange';

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
    enablePrimaryPlay = false,
    getRowProps,
}: MediaShelfProps) {
    const premiumPlaybackBlocked = usePremiumPlaybackBlocked();
    const {
        columns,
        flattenedItems,
        getRenderableItem,
        reachedLimit,
        renderableItemCount,
        visibleItems,
    } = useShelfItems({
        items,
        itemLoading,
        itemsPerColumn,
        maxVisible,
        orientation,
        totalCount,
        variant,
    });
    const { scrollRef, fade } = useScrollFade(orientation, [
        items.length,
        visibleItems.length,
        totalCount,
    ]);
    const routeHistory = useHistory();
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
    const canVirtualizeList =
        orientation === 'vertical' && variant === 'list' && maxVisible == null;
    const shouldVirtualize = canVirtualizeList && renderableItemCount > 48;
    const isVirtualDroppable = shouldVirtualize && draggable;
    const {
        bottomVirtualSpaceHeight,
        renderedVerticalItems,
        reservedItemHeight,
        topVirtualSpaceHeight,
    } = useVirtualShelfRange({
        activeIndex,
        canVirtualizeList,
        focusRefs,
        getRenderableItem,
        hasMore,
        loadingMore,
        onLoadMore,
        reachedLimit,
        renderableItemCount,
        scrollRef,
        shouldVirtualize,
        visibleItemCount: visibleItems.length,
    });
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

    useShelfPaginationObserver({
        hasMore,
        itemsPerColumn,
        loadingMore,
        maxVisible,
        onLoadMore,
        orientation,
        reachedLimit,
        scrollRef,
        sentinelRef,
        shouldVirtualize,
    });

    useShelfScrollReset({
        orientation,
        scrollRef,
        visibleItems,
    });

    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;
            if (!onReorder) return;
            const next = [...flattenedItems];
            const [moved] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, moved);
            onReorder(next, {
                sourceIndex: result.source.index,
                destinationIndex: result.destination.index,
            });
        },
        [flattenedItems, onReorder]
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
            const seed = hashShelfItemId(item.id ?? '') ^ (index << 1);
            const { content, canActivate, handleNavigate } = buildShelfItemView(
                {
                    cardSize,
                    effectiveColumnWidth,
                    enablePrimaryPlay,
                    getActions,
                    getRowProps,
                    item,
                    index,
                    orientation,
                    premiumPlaybackBlocked,
                    routeHistory,
                    seed,
                    showImage,
                    trackSubtitleMode,
                    variant,
                }
            );
            const draggableProps = dragProvided?.draggableProps;
            const dragHandleProps = dragProvided?.dragHandleProps ?? undefined;
            const cloneWidth = isClone
                ? (focusRefs.current[index]?.getBoundingClientRect().width ??
                  scrollRef.current?.getBoundingClientRect().width)
                : undefined;

            return (
                <div
                    key={getShelfItemKey(item, index)}
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
            cardSize,
            effectiveColumnWidth,
            enablePrimaryPlay,
            getActions,
            getRowProps,
            handleItemFocus,
            handleItemKeyDown,
            interactive,
            offscreenItemStyle,
            orientation,
            premiumPlaybackBlocked,
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
                        const key = getShelfItemKey(item, flatIndex);
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
                        key={getShelfItemKey(item, index)}
                        draggableId={getShelfItemKey(item, index)}
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
                        key={getShelfItemKey(item, index)}
                        draggableId={getShelfItemKey(item, index)}
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
            <ShelfFades fade={fade} orientation={orientation} />
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
