import type { MediaActionGroup } from '../../../shared/types';
import {
    MediaSection,
    type MediaSectionState,
} from '../../components/media/MediaSection';
import { MediaShelf } from '../../components/media/MediaShelf';
import type { MediaShelfItem } from '../../types/mediaShelf';
import type { PlaylistDedupableItem } from './duplicates';

export function PlaylistTracksSection({
    canReorder,
    getItemActions,
    hasMore,
    items,
    loading,
    loadingMore,
    onLoadMore,
    onReorder,
    totalCount,
}: {
    canReorder: boolean;
    getItemActions: (item: MediaShelfItem) => MediaActionGroup | null;
    hasMore?: boolean;
    items: PlaylistDedupableItem[];
    loading: boolean;
    loadingMore?: boolean;
    onLoadMore: () => void;
    onReorder: (
        next: MediaShelfItem[],
        context?: { sourceIndex: number; destinationIndex: number }
    ) => void;
    totalCount?: number;
}) {
    const section = {
        id: 'playlist-tracks',
        title: 'Tracks',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        items,
        totalCount,
        hasMore,
        loadingMore,
    } satisfies MediaSectionState;

    return (
        <MediaSection
            editing={false}
            loading={loading}
            section={section}
            onChange={() => undefined}
            renderContent={({ loading: sectionLoading }) => (
                <MediaShelf
                    items={items}
                    variant="list"
                    orientation="vertical"
                    itemsPerColumn={6}
                    enablePrimaryPlay
                    draggable={canReorder}
                    interactive={!sectionLoading}
                    itemLoading={sectionLoading}
                    totalCount={totalCount}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={onLoadMore}
                    onReorder={onReorder}
                    getActions={(item) => getItemActions(item)}
                    getRowProps={(item) => ({
                        showPosition: true,
                        position: (item as PlaylistDedupableItem).playlistIndex,
                    })}
                />
            )}
        />
    );
}
