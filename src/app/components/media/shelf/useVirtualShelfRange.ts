import {
    type MutableRefObject,
    type RefObject,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { getScrollParent } from './layout';
import type { RenderableShelfItem } from './types';

type VirtualRange = {
    start: number;
    end: number;
};

export function useVirtualShelfRange({
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
    visibleItemCount,
}: {
    activeIndex: number;
    canVirtualizeList: boolean;
    focusRefs: MutableRefObject<Array<HTMLElement | null>>;
    getRenderableItem: (index: number) => RenderableShelfItem;
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore?: () => void;
    reachedLimit: boolean;
    renderableItemCount: number;
    scrollRef: RefObject<HTMLElement | null>;
    shouldVirtualize: boolean;
    visibleItemCount: number;
}) {
    const [reservedItemHeight, setReservedItemHeight] = useState(52);
    const [virtualRange, setVirtualRange] = useState<VirtualRange>(() => ({
        start: 0,
        end: renderableItemCount,
    }));
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
        scrollRef,
        visibleItemCount,
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
    }, [renderableItemCount, reservedItemHeight, scrollRef, shouldVirtualize]);

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
        renderableItemCount,
        scrollRef,
        shouldVirtualize,
        virtualRange.end,
        virtualRange.start,
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
        if (virtualRange.end >= Math.max(1, visibleItemCount - preloadCount)) {
            onLoadMore();
        }
    }, [
        hasMore,
        loadingMore,
        onLoadMore,
        reachedLimit,
        shouldVirtualize,
        virtualRange.end,
        visibleItemCount,
    ]);

    return {
        bottomVirtualSpaceHeight: shouldVirtualize
            ? Math.max(0, renderableItemCount - virtualRange.end) *
              reservedItemHeight
            : 0,
        renderedVerticalItems,
        reservedItemHeight,
        topVirtualSpaceHeight: shouldVirtualize
            ? virtualRange.start * reservedItemHeight
            : 0,
    };
}
