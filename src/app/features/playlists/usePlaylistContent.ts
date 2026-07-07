import {
    useCallback,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import type { Market } from '@spotify/web-api-ts-sdk';

import { createLogger, logError } from '../../../shared/logging';
import {
    getCachedPlaylistContentState,
    loadPlaylistItemsPage,
    loadPlaylistContentState,
    storePlaylistContentState,
    type PlaylistContentState,
} from './store';

const logger = createLogger('playlist');

export function usePlaylistContent({
    active,
    locale,
    market,
    playlistId,
}: {
    active: boolean;
    locale: string;
    market: Market;
    playlistId?: string;
}): {
    data: PlaylistContentState | null;
    loading: boolean;
    loadMoreItems: () => Promise<void>;
    reloadPlaylist: () => Promise<void>;
    setData: Dispatch<SetStateAction<PlaylistContentState | null>>;
} {
    const [data, setData] = useState<PlaylistContentState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!active || !playlistId) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        void getCachedPlaylistContentState(playlistId).then((cached) => {
            if (cancelled || !cached.entry) return;
            setData(cached.entry);
        });

        void (async () => {
            try {
                const nextData = await loadPlaylistContentState({
                    playlistId,
                    market,
                    locale,
                });
                if (!cancelled) setData(nextData);
            } catch (error) {
                if (!cancelled) {
                    logError(logger, 'Failed to load playlist', error);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [active, locale, market, playlistId]);

    const reloadPlaylist = useCallback(async () => {
        if (!playlistId) return;
        setLoading(true);
        try {
            const nextData = await loadPlaylistContentState({
                playlistId,
                market,
                locale,
            });
            setData(nextData);
        } catch (error) {
            logError(logger, 'Failed to load playlist', error);
        } finally {
            setLoading(false);
        }
    }, [locale, market, playlistId]);

    const loadMoreItems = useCallback(async () => {
        const currentData = data;
        if (
            !currentData ||
            currentData.itemsLoadingMore ||
            !currentData.itemsHasMore ||
            !playlistId
        ) {
            return;
        }

        const offset = currentData.itemsOffset;
        const snapshotId = currentData.snapshotId;

        setData((previous) =>
            previous && previous.itemsOffset === offset
                ? { ...previous, itemsLoadingMore: true }
                : previous
        );

        try {
            const page = await loadPlaylistItemsPage({
                playlistId,
                market,
                locale,
                offset,
            });
            const nextData = await storePlaylistContentState({
                playlist: currentData.playlist,
                items: [...currentData.items, ...page.items],
                totalDurationMs: currentData.totalDurationMs + page.durationMs,
                itemsOffset: page.nextOffset,
                itemsHasMore: page.hasMore,
                itemsLoadingMore: false,
                snapshotId: snapshotId ?? currentData.snapshotId,
            });
            setData((previous) =>
                previous && previous.itemsOffset === offset
                    ? nextData
                    : previous
            );
        } catch (error) {
            logError(logger, 'Failed to load more playlist items', error);
            setData((previous) =>
                previous ? { ...previous, itemsLoadingMore: false } : previous
            );
        }
    }, [data, locale, market, playlistId]);

    useEffect(() => {
        if (!data || data.itemsLoadingMore) return;
        void storePlaylistContentState({
            playlist: data.playlist,
            items: data.items,
            totalDurationMs: data.totalDurationMs,
            itemsOffset: data.itemsOffset,
            itemsHasMore: data.itemsHasMore,
            itemsLoadingMore: false,
            snapshotId: data.snapshotId,
        });
    }, [
        data?.items,
        data?.itemsHasMore,
        data?.itemsLoadingMore,
        data?.itemsOffset,
        data?.playlist,
        data?.snapshotId,
        data?.totalDurationMs,
    ]);

    return {
        data,
        loading,
        loadMoreItems,
        reloadPlaylist,
        setData,
    };
}
