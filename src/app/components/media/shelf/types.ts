import type { MediaActionGroup } from '../../../../shared/types';
import type { MediaShelfItem } from '../../../types/mediaShelf';
import type { MediaRowProps } from '../MediaRow';

export type MediaShelfOrientation = 'vertical' | 'horizontal';
export type MediaShelfVariant = 'list' | 'tile';
export type TrackSubtitleMode = 'artist' | 'artist-album' | 'artists';

export interface MediaShelfProps {
    droppableId?: string;
    interactive?: boolean;
    items: MediaShelfItem[];
    draggable?: boolean;
    orientation?: MediaShelfOrientation;
    variant?: MediaShelfVariant;
    itemsPerColumn?: number;
    columnWidth?: number;
    maxVisible?: number;
    fixedHeight?: number;
    totalCount?: number;
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
    enablePrimaryPlay?: boolean;
    getRowProps?: (
        item: MediaShelfItem,
        index: number
    ) => Partial<
        Pick<
            MediaRowProps,
            'showPosition' | 'position' | 'selection' | 'className'
        >
    >;
}

export type RenderableShelfItem = {
    item: MediaShelfItem;
    index: number;
    loaded: boolean;
};
