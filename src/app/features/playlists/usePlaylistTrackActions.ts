import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { createLogger, logError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import { buildMediaActions } from '../../mediaActions';
import type { MediaShelfItem } from '../../types/mediaShelf';
import type { PlaylistDedupableItem } from './duplicates';
import type { PlaylistContentState } from './store';

const logger = createLogger('playlist');

export function usePlaylistTrackActions({
    canEdit,
    data,
    premiumRequired,
    reloadPlaylist,
    setData,
}: {
    canEdit: boolean;
    data: PlaylistContentState | null;
    premiumRequired: boolean;
    reloadPlaylist: () => Promise<void>;
    setData: Dispatch<SetStateAction<PlaylistContentState | null>>;
}) {
    const removeItem = useCallback(
        async (item: MediaShelfItem) => {
            if (!data || !item.uri) return;
            try {
                await sendSpotifyMessage('removePlaylistItems', {
                    id: data.playlist.id,
                    uris: [item.uri],
                    snapshotId: data.snapshotId,
                });
                await reloadPlaylist();
            } catch (error) {
                logError(logger, 'Failed to remove playlist item', error);
            }
        },
        [data, reloadPlaylist]
    );

    const reorderItems = useCallback(
        (
            next: MediaShelfItem[],
            context?: { sourceIndex: number; destinationIndex: number }
        ) => {
            const previousItems = data?.items ?? [];
            setData((previous) =>
                previous
                    ? { ...previous, items: next as PlaylistDedupableItem[] }
                    : previous
            );
            if (!context || !data || !canEdit) return;

            const { sourceIndex, destinationIndex } = context;
            const insertBefore =
                destinationIndex > sourceIndex
                    ? destinationIndex + 1
                    : destinationIndex;

            void (async () => {
                try {
                    const result = await sendSpotifyMessage(
                        'movePlaylistItems',
                        {
                            id: data.playlist.id,
                            rangeStart: sourceIndex,
                            rangeLength: 1,
                            insertBefore,
                            snapshotId: data.snapshotId,
                        }
                    );
                    setData((previous) =>
                        previous
                            ? { ...previous, snapshotId: result.snapshot_id }
                            : previous
                    );
                } catch (error) {
                    logError(logger, 'Failed to reorder playlist items', error);
                    setData((previous) =>
                        previous
                            ? { ...previous, items: previousItems }
                            : previous
                    );
                }
            })();
        },
        [canEdit, data, setData]
    );

    const getItemActions = useCallback(
        (item: MediaShelfItem) => {
            const base = buildMediaActions(item, {
                premiumPlaybackBlocked: premiumRequired,
            });
            if (!canEdit || !item.uri) return base;
            return {
                primary: base.primary,
                secondary: [
                    ...base.secondary,
                    {
                        id: 'remove-playlist-item',
                        label: 'Remove from playlist',
                        shortcut: '⌫',
                        onSelect: () => {
                            void removeItem(item);
                        },
                    },
                ],
            };
        },
        [canEdit, premiumRequired, removeItem]
    );

    return {
        getItemActions,
        reorderItems,
    };
}
