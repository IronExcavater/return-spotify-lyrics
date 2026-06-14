import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

import type { MediaItem } from '../../../shared/types';
import {
    LIKED_PLAYLIST_ID,
    ensureTrackLikedMembership,
    ensureTrackPlaylistIndex,
    formatTrackPlaylistError,
    loadTrackPlaylistCatalog,
    loadTrackPlaylists,
    resolveTrackPlaylistTarget,
    toggleTrackPlaylistMembership,
    type PlaylistCatalogEntry,
} from './store';

export type PlaylistPickerRow = {
    id: string;
    name: string;
    imageUrl?: string;
    subtitle?: string;
    editable: boolean;
    contains: boolean | null;
    loading: boolean;
    pending: boolean;
    isLiked: boolean;
    playlist?: PlaylistCatalogEntry;
};

type CatalogEntryRef = Pick<PlaylistCatalogEntry, 'id' | 'snapshotId'>;

function snapshotMatchesPrevious(
    previousById: Map<string, CatalogEntryRef>,
    playlist: CatalogEntryRef
) {
    return previousById.get(playlist.id)?.snapshotId === playlist.snapshotId;
}

function reconcileMembership(
    previousCatalog: CatalogEntryRef[],
    nextCatalog: CatalogEntryRef[],
    membership: Record<string, boolean | null>,
    newMembership: boolean | null = null
) {
    const previousById = new Map(previousCatalog.map((p) => [p.id, p]));
    const next = { ...membership };

    nextCatalog.forEach((playlist) => {
        next[playlist.id] = snapshotMatchesPrevious(previousById, playlist)
            ? (next[playlist.id] ?? newMembership)
            : previousById.has(playlist.id)
              ? null
              : newMembership;
    });

    return next;
}

function reconcileLoadingById(
    previousCatalog: CatalogEntryRef[],
    nextCatalog: CatalogEntryRef[],
    loadingById: Record<string, boolean>
) {
    const previousById = new Map(previousCatalog.map((p) => [p.id, p]));
    const next = { ...loadingById };

    nextCatalog.forEach((playlist) => {
        next[playlist.id] = snapshotMatchesPrevious(previousById, playlist)
            ? (next[playlist.id] ?? true)
            : true;
    });

    return next;
}

function buildRows({
    catalog,
    loadingById,
    membership,
    pendingById,
    query,
}: {
    catalog: PlaylistCatalogEntry[];
    loadingById: Record<string, boolean>;
    membership: Record<string, boolean | null>;
    pendingById: Record<string, boolean>;
    query: string;
}) {
    const likedRow: PlaylistPickerRow = {
        id: LIKED_PLAYLIST_ID,
        name: 'Liked Songs',
        imageUrl: undefined,
        subtitle: 'Your library',
        editable: true,
        contains: membership[LIKED_PLAYLIST_ID] ?? null,
        loading: loadingById[LIKED_PLAYLIST_ID] ?? false,
        pending: pendingById[LIKED_PLAYLIST_ID] ?? false,
        isLiked: true,
        playlist: undefined,
    };
    const rows = [
        likedRow,
        ...catalog
            .filter((playlist) => playlist.editable)
            .map(
                (playlist): PlaylistPickerRow => ({
                    id: playlist.id,
                    name: playlist.name,
                    imageUrl: playlist.imageUrl,
                    subtitle: playlist.ownerName,
                    editable: playlist.editable,
                    contains: membership[playlist.id] ?? null,
                    loading: loadingById[playlist.id] ?? false,
                    pending: pendingById[playlist.id] ?? false,
                    isLiked: false,
                    playlist,
                })
            ),
    ];
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) return rows;

    return rows.filter((row) =>
        `${row.name} ${row.subtitle ?? ''}`.toLowerCase().includes(trimmedQuery)
    );
}

function shouldPausePlaylistHydration(error: string | null) {
    return error?.toLowerCase().includes('rate limiting playlist requests');
}

export function usePlaylistPicker(item?: MediaItem | null) {
    const target = resolveTrackPlaylistTarget(item);
    const targetTrackId = target?.trackId;
    const targetTrackUri = target?.trackUri;
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<PlaylistCatalogEntry[]>([]);
    const [membership, setMembership] = useState<
        Record<string, boolean | null>
    >({});
    const [loadingById, setLoadingById] = useState<Record<string, boolean>>({});
    const [pendingById, setPendingById] = useState<Record<string, boolean>>({});
    const [createOpen, setCreateOpen] = useState(false);
    const rows = useMemo(
        () =>
            buildRows({
                catalog,
                loadingById,
                membership,
                pendingById,
                query,
            }),
        [catalog, loadingById, membership, pendingById, query]
    );
    const showLoadingRows = loading && catalog.length === 0 && !error;
    const visibleRows = showLoadingRows ? null : rows;

    useEffect(() => {
        if (!targetTrackId || !targetTrackUri) {
            setUserId(undefined);
            setCatalog([]);
            setMembership({});
            setLoadingById({});
            setPendingById({});
            setError(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setUserId(undefined);
        setCatalog([]);
        setMembership({});
        setLoadingById({});
        setPendingById({});
        setError(null);
        setLoading(true);

        async function loadMenu() {
            try {
                const initialData = await loadTrackPlaylists({
                    trackId: targetTrackId,
                    trackUri: targetTrackUri,
                });
                if (cancelled) return;

                setUserId(initialData.userId);
                setCatalog(initialData.catalog);
                setMembership(initialData.membership);
                setLoadingById(initialData.loadingById);

                if (initialData.needsLikedRefresh) {
                    void refreshLikedMembership({
                        isCancelled: () => cancelled,
                        setError,
                        setLoadingById,
                        setMembership,
                        trackId: targetTrackId,
                        userId: initialData.userId,
                    });
                }

                try {
                    const nextCatalog = await loadTrackPlaylistCatalog(
                        initialData.userId
                    );
                    if (cancelled) return;
                    setCatalog(nextCatalog);
                    setMembership((previous) =>
                        reconcileMembership(
                            initialData.catalog,
                            nextCatalog,
                            previous
                        )
                    );
                    setLoadingById((previous) =>
                        reconcileLoadingById(
                            initialData.catalog,
                            nextCatalog,
                            previous
                        )
                    );
                } catch (nextError) {
                    if (!cancelled) {
                        setError(
                            formatTrackPlaylistError(
                                nextError,
                                'Failed to load playlists'
                            )
                        );
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
            } catch (nextError) {
                if (!cancelled) {
                    setError(
                        formatTrackPlaylistError(
                            nextError,
                            'Failed to load playlists'
                        )
                    );
                    setLoading(false);
                }
            }
        }

        void loadMenu();

        return () => {
            cancelled = true;
        };
    }, [targetTrackId, targetTrackUri]);

    useEffect(() => {
        if (!targetTrackId || shouldPausePlaylistHydration(error)) return;

        let cancelled = false;
        const toHydrate = rows
            .filter(
                (row) =>
                    !row.isLiked &&
                    row.playlist &&
                    row.contains === null &&
                    loadingById[row.id]
            )
            .slice(0, 1)
            .map((row) => row.playlist as PlaylistCatalogEntry);

        if (toHydrate.length === 0) return;

        async function hydrate() {
            for (const playlist of toHydrate) {
                try {
                    const index = await ensureTrackPlaylistIndex({
                        playlist,
                        userId,
                        trackId: targetTrackId,
                    });
                    if (cancelled) return;
                    setMembership((previous) => ({
                        ...previous,
                        [playlist.id]: index.trackIds.includes(targetTrackId),
                    }));
                } catch (nextError) {
                    if (!cancelled) {
                        setError(
                            formatTrackPlaylistError(
                                nextError,
                                'Failed to load playlists'
                            )
                        );
                    }
                } finally {
                    if (!cancelled) {
                        setLoadingById((previous) => ({
                            ...previous,
                            [playlist.id]: false,
                        }));
                    }
                }
            }
        }

        void hydrate();

        return () => {
            cancelled = true;
        };
    }, [error, loadingById, rows, targetTrackId, userId]);

    const toggleRow = useCallback(
        async (row: PlaylistPickerRow) => {
            if (!targetTrackId || !targetTrackUri) return;

            const current = membership[row.id];
            if (current == null) return;

            const shouldSave = !current;

            setPendingById((previous) => ({
                ...previous,
                [row.id]: true,
            }));
            setMembership((previous) => ({
                ...previous,
                [row.id]: shouldSave,
            }));
            setError(null);

            try {
                await toggleTrackPlaylistMembership({
                    playlistId: row.id,
                    playlist: row.playlist,
                    trackId: targetTrackId,
                    trackUri: targetTrackUri,
                    shouldSave,
                    userId,
                });
            } catch (nextError) {
                setMembership((previous) => ({
                    ...previous,
                    [row.id]: current,
                }));
                setError(
                    formatTrackPlaylistError(
                        nextError,
                        'Failed to update playlist'
                    )
                );
            } finally {
                setPendingById((previous) => ({
                    ...previous,
                    [row.id]: false,
                }));
            }
        },
        [membership, targetTrackId, targetTrackUri, userId]
    );

    const refreshAfterCreate = useCallback(() => {
        setLoading(true);
        void loadTrackPlaylistCatalog(userId)
            .then((nextCatalog) => {
                setCatalog(nextCatalog);
                setMembership((previous) =>
                    reconcileMembership(catalog, nextCatalog, previous, false)
                );
                setLoadingById((previous) =>
                    reconcileLoadingById(catalog, nextCatalog, previous)
                );
            })
            .catch((nextError) =>
                setError(
                    formatTrackPlaylistError(
                        nextError,
                        'Failed to load playlists'
                    )
                )
            )
            .finally(() => setLoading(false));
    }, [catalog, userId]);

    return {
        createOpen,
        error,
        loading,
        query,
        rows: visibleRows ?? [],
        setCreateOpen,
        setQuery,
        showLoadingRows,
        refreshAfterCreate,
        toggleRow,
    };
}

async function refreshLikedMembership({
    isCancelled,
    setError,
    setLoadingById,
    setMembership,
    trackId,
    userId,
}: {
    isCancelled: () => boolean;
    setError: (error: string | null) => void;
    setLoadingById: Dispatch<SetStateAction<Record<string, boolean>>>;
    setMembership: Dispatch<SetStateAction<Record<string, boolean | null>>>;
    trackId: string;
    userId?: string;
}) {
    try {
        const saved = await ensureTrackLikedMembership({ trackId, userId });
        if (isCancelled()) return;
        setMembership((previous) => ({
            ...previous,
            [LIKED_PLAYLIST_ID]: saved,
        }));
    } catch (nextError) {
        if (isCancelled()) return;
        setError(
            formatTrackPlaylistError(nextError, 'Failed to load Liked Songs')
        );
    } finally {
        if (!isCancelled()) {
            setLoadingById((previous) => ({
                ...previous,
                [LIKED_PLAYLIST_ID]: false,
            }));
        }
    }
}
