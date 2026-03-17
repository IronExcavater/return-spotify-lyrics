import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
    CheckIcon,
    HeartFilledIcon,
    PlusIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
import { Avatar, Flex, IconButton, Skeleton, Text } from '@radix-ui/themes';

import type { MediaItem } from '../../shared/types';
import {
    LIKED_PLAYLIST_ID,
    ensureTrackLikedMembership,
    ensureTrackPlaylistIndex,
    formatTrackPlaylistError,
    loadTrackPlaylists,
    loadTrackPlaylistCatalog,
    resolveTrackPlaylistTarget,
    toggleTrackPlaylistMembership,
    type PlaylistCatalogEntry,
} from '../data/trackPlaylists';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { SearchList, SearchListItem, SearchListMessage } from './SearchList';
import { SkeletonText } from './SkeletonText';

type Props = {
    item?: MediaItem | null;
    headerStart?: ReactNode;
};

type PlaylistRow = {
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

const PICKER_WIDTH = '18rem';
const PICKER_MAX_LIST_HEIGHT =
    'min(15rem, calc(var(--radix-dropdown-menu-content-available-height, 16rem) - 2.5rem))';

function PlaylistIndicator({
    active,
    loading,
    pending,
    disabled,
    onClick,
}: {
    active: boolean | null;
    loading: boolean;
    pending: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    if (loading || pending) {
        return (
            <IconButton
                size="1"
                radius="full"
                variant="soft"
                disabled
                className="h-7 w-7 shrink-0"
                aria-label="Updating playlist"
            >
                <ReloadIcon className="animate-spin" />
            </IconButton>
        );
    }

    if (active === null) {
        return (
            <IconButton
                size="1"
                radius="full"
                variant="soft"
                disabled
                className="h-7 w-7 shrink-0"
                aria-label="Checking playlist"
            >
                <PlusIcon />
            </IconButton>
        );
    }

    return (
        <IconButton
            size="1"
            radius="full"
            variant={active ? 'solid' : 'soft'}
            disabled={disabled}
            className="h-7 w-7 shrink-0"
            aria-label={active ? 'Remove from playlist' : 'Save to playlist'}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!disabled) onClick();
            }}
        >
            {active ? <CheckIcon /> : <PlusIcon />}
        </IconButton>
    );
}

function PlaylistRowItem({
    row,
    loading = false,
    onToggle,
}: {
    row: PlaylistRow;
    loading?: boolean;
    onToggle?: (id: string, playlist?: PlaylistCatalogEntry) => void;
}) {
    const subtitle = row.isLiked ? undefined : row.subtitle;
    const skeletonParts = [row.name, subtitle, row.imageUrl];

    return (
        <SearchListItem highlight={!loading}>
            <Skeleton loading={loading}>
                <Avatar
                    src={row.imageUrl}
                    fallback={
                        row.isLiked ? (
                            <HeartFilledIcon />
                        ) : (
                            <Text size="1" weight="bold">
                                {row.name.charAt(0).toUpperCase()}
                            </Text>
                        )
                    }
                    radius="small"
                    size="2"
                    className="shrink-0"
                />
            </Skeleton>
            <Flex
                direction="column"
                justify="center"
                className="min-w-0 flex-1"
            >
                <Fade enabled={!loading} grow>
                    <SkeletonText
                        loading={loading}
                        parts={skeletonParts}
                        preset="media-row"
                    >
                        <Marquee mode="bounce" grow>
                            <Text
                                size="1"
                                weight="medium"
                                className="block min-w-0"
                            >
                                {row.name}
                            </Text>
                        </Marquee>
                    </SkeletonText>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading} grow>
                        <SkeletonText
                            loading={loading}
                            parts={skeletonParts}
                            preset="media-row"
                            variant="subtitle"
                        >
                            <Marquee mode="left" grow>
                                <Text
                                    size="1"
                                    color="gray"
                                    className="block min-w-0"
                                >
                                    {subtitle}
                                </Text>
                            </Marquee>
                        </SkeletonText>
                    </Fade>
                )}
            </Flex>
            {loading ? (
                <Skeleton loading>
                    <div className="h-7 w-7 rounded-full" />
                </Skeleton>
            ) : (
                <PlaylistIndicator
                    active={row.contains}
                    loading={row.loading}
                    pending={row.pending}
                    disabled={row.pending || row.loading || !row.editable}
                    onClick={() => onToggle?.(row.id, row.playlist)}
                />
            )}
        </SearchListItem>
    );
}

const LOADING_ROWS: PlaylistRow[] = Array.from({ length: 8 }, (_, index) => ({
    id: `loading-${index}`,
    name: `Playlist ${index + 1}`,
    subtitle: 'Loading owner',
    editable: false,
    contains: null,
    loading: true,
    pending: false,
    isLiked: false,
}));

export function PlaylistPicker({ item, headerStart }: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const target = resolveTrackPlaylistTarget(item);
    const targetTrackId = target?.trackId;
    const targetTrackUri = target?.trackUri;
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const shouldPauseHydration = error
        ?.toLowerCase()
        .includes('rate limiting playlist requests');
    const [catalog, setCatalog] = useState<PlaylistCatalogEntry[]>([]);
    const [membership, setMembership] = useState<
        Record<string, boolean | null>
    >({});
    const [loadingById, setLoadingById] = useState<Record<string, boolean>>({});
    const [pendingById, setPendingById] = useState<Record<string, boolean>>({});

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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

        const loadMenu = async () => {
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
                    void ensureTrackLikedMembership({
                        trackId: targetTrackId,
                        userId: initialData.userId,
                    })
                        .then((saved) => {
                            if (cancelled) return;
                            setMembership((previous) => ({
                                ...previous,
                                [LIKED_PLAYLIST_ID]: saved,
                            }));
                        })
                        .catch((nextError) => {
                            if (cancelled) return;
                            setError(
                                formatTrackPlaylistError(
                                    nextError,
                                    'Failed to load Liked Songs'
                                )
                            );
                        })
                        .finally(() => {
                            if (cancelled) return;
                            setLoadingById((previous) => ({
                                ...previous,
                                [LIKED_PLAYLIST_ID]: false,
                            }));
                        });
                }

                try {
                    const nextCatalog = await loadTrackPlaylistCatalog(
                        initialData.userId
                    );
                    if (cancelled) return;
                    setCatalog(nextCatalog);
                    setMembership((previous) => {
                        const nextMembership = { ...previous };
                        nextCatalog.forEach((playlist) => {
                            nextMembership[playlist.id] ??= null;
                        });
                        return nextMembership;
                    });
                    setLoadingById((previous) => {
                        const nextLoadingById = { ...previous };
                        nextCatalog.forEach((playlist) => {
                            nextLoadingById[playlist.id] ??= true;
                        });
                        return nextLoadingById;
                    });
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
        };

        void loadMenu();

        return () => {
            cancelled = true;
        };
    }, [targetTrackId, targetTrackUri]);

    const rows = useMemo<PlaylistRow[]>(() => {
        const likedRow: PlaylistRow = {
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

        const playlistRows = catalog
            .filter((playlist) => playlist.editable)
            .map(
                (playlist): PlaylistRow => ({
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
            );

        const allRows = [likedRow, ...playlistRows];
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery) return allRows;

        return allRows.filter((row) =>
            `${row.name} ${row.subtitle ?? ''}`
                .toLowerCase()
                .includes(trimmedQuery)
        );
    }, [catalog, loadingById, membership, pendingById, query]);

    useEffect(() => {
        if (!targetTrackId || shouldPauseHydration) return;

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

        const hydrate = async () => {
            for (const playlist of toHydrate) {
                try {
                    const index = await ensureTrackPlaylistIndex({
                        playlist,
                        userId,
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
        };

        void hydrate();

        return () => {
            cancelled = true;
        };
    }, [loadingById, rows, shouldPauseHydration, targetTrackId, userId]);

    const handleToggle = async (
        rowId: string,
        playlist?: PlaylistCatalogEntry
    ) => {
        if (!targetTrackId || !targetTrackUri) return;

        const current = membership[rowId];
        if (current == null) return;

        const shouldSave = !current;

        setPendingById((previous) => ({
            ...previous,
            [rowId]: true,
        }));
        setMembership((previous) => ({
            ...previous,
            [rowId]: shouldSave,
        }));
        setError(null);

        try {
            await toggleTrackPlaylistMembership({
                playlistId: rowId,
                playlist,
                trackId: targetTrackId,
                trackUri: targetTrackUri,
                shouldSave,
                userId,
            });
        } catch (nextError) {
            setMembership((previous) => ({
                ...previous,
                [rowId]: current,
            }));
            setError(
                formatTrackPlaylistError(nextError, 'Failed to update playlist')
            );
        } finally {
            setPendingById((previous) => ({
                ...previous,
                [rowId]: false,
            }));
        }
    };

    const showLoadingRows = loading && catalog.length === 0 && !error;
    const visibleRows = showLoadingRows ? LOADING_ROWS : rows;

    return (
        <SearchList
            items={visibleRows}
            query={query}
            onQueryChange={setQuery}
            onClearQuery={() => setQuery('')}
            placeholder="Search playlists"
            searchAriaLabel="Search playlists"
            clearSearchAriaLabel="Clear playlist search"
            inputRef={inputRef}
            leading={headerStart}
            width={PICKER_WIDTH}
            maxListHeight={PICKER_MAX_LIST_HEIGHT}
            beforeItems={
                error ? (
                    <SearchListMessage className="wrap-break-word">
                        {error}
                    </SearchListMessage>
                ) : null
            }
            emptyState={
                !loading ? (
                    <SearchListMessage>No matches</SearchListMessage>
                ) : null
            }
            getKey={(row) => row.id}
            renderItem={(row) => (
                <PlaylistRowItem
                    row={row}
                    loading={showLoadingRows}
                    onToggle={(id, playlist) => void handleToggle(id, playlist)}
                />
            )}
        />
    );
}
