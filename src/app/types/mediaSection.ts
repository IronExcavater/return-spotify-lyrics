import type { MediaShelfItem } from '../components/MediaShelf';

export type MediaSectionState = {
    id: string;
    title: string;
    subtitle?: string;
    view?: 'card' | 'list';
    columns?: number;
    rows?: number;
    infinite?: 'columns' | 'rows' | null;
    rowHeight?: number;
    columnWidth?: number;
    clampUnit?: 'px' | 'items';
    cardSize?: 1 | 2 | 3;
    items: MediaShelfItem[];
    totalCount?: number;
    hasMore?: boolean;
    loadingMore?: boolean;
    wideColumns?: boolean;
    showImage?: boolean;
    trackSubtitleMode?: 'artist' | 'artist-album' | 'artists';
};
