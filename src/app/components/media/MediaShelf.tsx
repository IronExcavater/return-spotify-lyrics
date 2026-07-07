import { useCallback, useRef } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { usePremiumPlaybackBlocked } from '../../data/playbackAccess';
import { useHistory } from '../../hooks/useHistory';
import { useScrollFade } from '../../hooks/useScrollFade';
import { useShelfNavigation } from '../../hooks/useShelfNavigation';
import { ShelfContent } from './shelf/ShelfContent';
import { ShelfViewport } from './shelf/ShelfViewport';
import type { MediaShelfProps } from './shelf/types';
import { useShelfItemRenderer } from './shelf/useShelfItemRenderer';
import { useShelfItems } from './shelf/useShelfItems';
import { useShelfPaginationObserver } from './shelf/useShelfPaginationObserver';
import { useShelfScrollReset } from './shelf/useShelfScrollReset';
import { useShelfVirtualization } from './shelf/useShelfVirtualization';

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
    const {
        bottomVirtualSpaceHeight,
        isVirtualDroppable,
        offscreenItemStyle,
        renderedVerticalItems,
        shouldVirtualize,
        topVirtualSpaceHeight,
    } = useShelfVirtualization({
        activeIndex,
        draggable,
        focusRefs,
        getRenderableItem,
        hasMore,
        loadingMore,
        maxVisible,
        onLoadMore,
        orientation,
        reachedLimit,
        renderableItemCount,
        scrollRef,
        variant,
        visibleItemCount: visibleItems.length,
    });

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

    const { renderShelfItem, renderVirtualClone } = useShelfItemRenderer({
        activeIndex,
        cardSize,
        effectiveColumnWidth,
        enablePrimaryPlay,
        focusRefs,
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
        visibleItems,
    });
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
                {(dropProvided) => (
                    <ShelfViewport
                        className={className}
                        dropProvided={dropProvided}
                        fade={fade}
                        fixedHeight={fixedHeight}
                        interactive={interactive}
                        onFocusCapture={handleContainerFocusCapture}
                        onKeyDownCapture={handleContainerKeyDown}
                        orientation={orientation}
                        scrollRef={scrollRef}
                    >
                        <ShelfContent
                            bottomVirtualSpaceHeight={bottomVirtualSpaceHeight}
                            columnWidth={effectiveColumnWidth}
                            columns={columns}
                            draggable={draggable}
                            dropPlaceholder={dropProvided.placeholder}
                            isVirtualDroppable={isVirtualDroppable}
                            itemsPerColumn={itemsPerColumn}
                            orientation={orientation}
                            renderedVerticalItems={renderedVerticalItems}
                            renderItem={renderShelfItem}
                            sentinelRef={sentinelRef}
                            topVirtualSpaceHeight={topVirtualSpaceHeight}
                        />
                    </ShelfViewport>
                )}
            </Droppable>
        </DragDropContext>
    );
}
