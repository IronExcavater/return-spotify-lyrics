import { useEffect, type RefObject } from 'react';

import { getScrollParent } from './layout';
import type { MediaShelfOrientation } from './types';

export function useShelfPaginationObserver({
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
}: {
    hasMore: boolean;
    itemsPerColumn: number;
    loadingMore: boolean;
    maxVisible?: number;
    onLoadMore?: () => void;
    orientation: MediaShelfOrientation;
    reachedLimit: boolean;
    scrollRef: RefObject<HTMLDivElement | null>;
    sentinelRef: RefObject<HTMLDivElement | null>;
    shouldVirtualize: boolean;
}) {
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
        itemsPerColumn,
        loadingMore,
        maxVisible,
        onLoadMore,
        orientation,
        reachedLimit,
        scrollRef,
        sentinelRef,
        shouldVirtualize,
    ]);
}
