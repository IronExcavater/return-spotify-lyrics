import { useCallback, useMemo } from 'react';

import type { MediaShelfItem } from '../../../types/mediaShelf';
import {
    createLoadingShelfItem,
    getLoadingPlaceholderCount,
    groupShelfItemsByColumn,
} from './layout';
import type {
    MediaShelfOrientation,
    MediaShelfVariant,
    RenderableShelfItem,
} from './types';

export function useShelfItems({
    items,
    itemLoading,
    itemsPerColumn,
    maxVisible,
    orientation,
    totalCount,
    variant,
}: {
    items: MediaShelfItem[];
    itemLoading: boolean;
    itemsPerColumn: number;
    maxVisible?: number;
    orientation: MediaShelfOrientation;
    totalCount?: number;
    variant: MediaShelfVariant;
}) {
    const createLoadingItem = useCallback(
        (index: number) => createLoadingShelfItem(index, variant),
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
    const flattenedItems = useMemo(() => {
        if (items.length === 0 && itemLoading) {
            return Array.from({ length: loadingPlaceholderCount }, (_, index) =>
                createLoadingItem(index)
            );
        }
        return items.map((item) =>
            itemLoading ? { ...item, loading: true } : item
        );
    }, [createLoadingItem, itemLoading, items, loadingPlaceholderCount]);
    const capacity = useMemo(() => {
        if (maxVisible == null) return Number.POSITIVE_INFINITY;
        return orientation === 'horizontal'
            ? maxVisible * itemsPerColumn
            : maxVisible;
    }, [maxVisible, orientation, itemsPerColumn]);
    const visibleItems = useMemo(
        () => flattenedItems.slice(0, capacity),
        [flattenedItems, capacity]
    );
    const columns = useMemo(() => {
        if (orientation !== 'horizontal' || itemsPerColumn <= 0) {
            return [visibleItems];
        }

        return groupShelfItemsByColumn(visibleItems, itemsPerColumn);
    }, [visibleItems, orientation, itemsPerColumn]);
    const renderableItemCount =
        orientation === 'vertical' && maxVisible == null
            ? Math.max(visibleItems.length, totalCount ?? visibleItems.length)
            : visibleItems.length;
    const getRenderableItem = useCallback(
        (index: number): RenderableShelfItem => {
            const item = visibleItems[index] ?? createLoadingItem(index);
            return {
                item,
                index,
                loaded: index < visibleItems.length,
            };
        },
        [createLoadingItem, visibleItems]
    );

    return {
        columns,
        flattenedItems,
        getRenderableItem,
        reachedLimit: visibleItems.length >= capacity,
        renderableItemCount,
        visibleItems,
    };
}
