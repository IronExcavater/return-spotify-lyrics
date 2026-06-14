import { hashString } from '../../../../shared/math';
import type { MediaShelfItem } from '../../../types/mediaShelf';
import type { MediaShelfOrientation, MediaShelfVariant } from './types';

const LOADING_LABEL = '\u00A0';
const MAX_LOADING_ITEMS = 48;
const DEFAULT_VERTICAL_LOADING_COUNT = 14;
const DEFAULT_HORIZONTAL_LOADING_COLUMNS = {
    list: 4,
    tile: 6,
} as const;

export function hashShelfItemId(value: string) {
    return hashString(value, 0);
}

export function getShelfItemKey(item: MediaShelfItem, index: number) {
    return item.listKey ?? item.id ?? `${item.title ?? 'item'}-${index}`;
}

export function createLoadingShelfItem(
    index: number,
    variant: MediaShelfVariant
): MediaShelfItem {
    return {
        id: `loading-${index}`,
        listKey: `loading-${index}`,
        title: LOADING_LABEL,
        subtitle: LOADING_LABEL,
        kind: variant === 'tile' ? 'album' : 'track',
        loading: true,
    };
}

export function getLoadingPlaceholderCount({
    itemCount,
    totalCount,
    orientation,
    variant,
    itemsPerColumn,
    maxVisible,
}: {
    itemCount: number;
    totalCount?: number;
    orientation: MediaShelfOrientation;
    variant: MediaShelfVariant;
    itemsPerColumn: number;
    maxVisible?: number;
}) {
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
}

export function groupShelfItemsByColumn(
    items: MediaShelfItem[],
    itemsPerColumn: number
) {
    const grouped: MediaShelfItem[][] = [];

    items.forEach((item, index) => {
        const columnIndex = Math.floor(index / itemsPerColumn);
        if (!grouped[columnIndex]) grouped[columnIndex] = [];
        grouped[columnIndex].push(item);
    });

    return grouped;
}

export function getScrollParent(
    node: HTMLElement | null
): HTMLElement | Window {
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
        ) {
            return current;
        }
        current = current.parentElement;
    }
    return window;
}
