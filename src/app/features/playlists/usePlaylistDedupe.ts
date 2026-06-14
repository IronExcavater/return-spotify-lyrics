import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Market } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import {
    analyzePlaylistDuplicates,
    type PlaylistDedupableItem,
} from './duplicates';
import {
    ensurePlaylistContentStateLoaded,
    type PlaylistContentState,
} from './store';

const logger = createLogger('playlist');

type DedupeDialogState = {
    open: boolean;
    loading: boolean;
    removing: boolean;
};

const DEFAULT_DIALOG: DedupeDialogState = {
    open: false,
    loading: false,
    removing: false,
};

export function usePlaylistDedupe({
    canEdit,
    data,
    locale,
    market,
    playlistId,
    reloadPlaylist,
    showInitialLoading,
}: {
    canEdit: boolean;
    data: PlaylistContentState | null;
    locale: string;
    market: Market;
    playlistId?: string;
    reloadPlaylist: () => Promise<void>;
    showInitialLoading: boolean;
}) {
    const [items, setItems] = useState<PlaylistDedupableItem[] | null>(null);
    const [dialog, setDialog] = useState<DedupeDialogState>(DEFAULT_DIALOG);

    const patchDialog = useCallback((patch: Partial<DedupeDialogState>) => {
        setDialog((previous) => ({ ...previous, ...patch }));
    }, []);

    useEffect(() => {
        setItems(null);
        setDialog(DEFAULT_DIALOG);
    }, [playlistId]);

    const analysis = useMemo(
        () => analyzePlaylistDuplicates(items ?? data?.items ?? []),
        [data?.items, items]
    );

    const canOpen =
        canEdit &&
        !showInitialLoading &&
        !dialog.loading &&
        !dialog.removing &&
        (data?.items.length ?? 0) > 0;

    const open = useCallback(async () => {
        if (!data || !canEdit || !playlistId) return;

        setItems(data.itemsHasMore ? null : data.items);
        patchDialog({ open: true, loading: true });
        try {
            const complete = await ensurePlaylistContentStateLoaded({
                playlistId,
                market,
                locale,
                base: data,
            });
            setItems(complete.items);
        } catch (error) {
            logError(logger, 'Failed to prepare playlist dedupe', error);
            setItems(data.items);
        } finally {
            patchDialog({ loading: false });
        }
    }, [canEdit, data, locale, market, patchDialog, playlistId]);

    const removeDuplicates = useCallback(
        async (duplicates: PlaylistDedupableItem[]) => {
            if (!data || duplicates.length === 0) return;

            const tracksByUri = new Map<string, number[]>();
            duplicates.forEach((item) => {
                const uri = item.playlistTrackUri ?? item.uri;
                if (!uri) return;
                const positions = tracksByUri.get(uri) ?? [];
                positions.push(item.playlistIndex);
                tracksByUri.set(uri, positions);
            });

            if (tracksByUri.size === 0) return;

            patchDialog({ removing: true });
            try {
                await sendSpotifyMessage('removePlaylistItemsByPosition', {
                    id: data.playlist.id,
                    snapshotId: data.snapshotId,
                    tracks: Array.from(tracksByUri.entries()).map(
                        ([uri, positions]) => ({
                            uri,
                            positions: positions.sort(
                                (left, right) => left - right
                            ),
                        })
                    ),
                });
                await reloadPlaylist();
                setItems(null);
                patchDialog({ open: false });
            } catch (error) {
                logError(
                    logger,
                    'Failed to remove duplicate playlist items',
                    error
                );
            } finally {
                patchDialog({ removing: false });
            }
        },
        [data, patchDialog, reloadPlaylist]
    );

    return {
        analysis,
        canOpen,
        dialog,
        open,
        removeDuplicates,
        setOpen: (open: boolean) => patchDialog({ open }),
    };
}
