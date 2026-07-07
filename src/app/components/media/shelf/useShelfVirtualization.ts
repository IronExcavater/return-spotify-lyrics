import type { CSSProperties, MutableRefObject, RefObject } from 'react';

import type {
    MediaShelfOrientation,
    MediaShelfVariant,
    RenderableShelfItem,
} from './types';
import { useVirtualShelfRange } from './useVirtualShelfRange';

export function useShelfVirtualization({
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
    visibleItemCount,
}: {
    activeIndex: number;
    draggable: boolean;
    focusRefs: MutableRefObject<Array<HTMLElement | null>>;
    getRenderableItem: (index: number) => RenderableShelfItem;
    hasMore: boolean;
    loadingMore: boolean;
    maxVisible?: number;
    onLoadMore?: () => void;
    orientation: MediaShelfOrientation;
    reachedLimit: boolean;
    renderableItemCount: number;
    scrollRef: RefObject<HTMLElement | null>;
    variant: MediaShelfVariant;
    visibleItemCount: number;
}) {
    const canVirtualizeList =
        orientation === 'vertical' && variant === 'list' && maxVisible == null;
    const shouldVirtualize = canVirtualizeList && renderableItemCount > 48;
    const range = useVirtualShelfRange({
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
    });

    const offscreenItemStyle: CSSProperties | undefined =
        !shouldVirtualize &&
        orientation === 'vertical' &&
        variant === 'list' &&
        !draggable
            ? {
                  contentVisibility: 'auto',
                  containIntrinsicSize: `${range.reservedItemHeight}px`,
              }
            : undefined;

    return {
        ...range,
        isVirtualDroppable: shouldVirtualize && draggable,
        offscreenItemStyle,
        shouldVirtualize,
    };
}
