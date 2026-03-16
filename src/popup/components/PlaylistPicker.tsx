import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CheckIcon,
    Cross2Icon,
    HeartFilledIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ReloadIcon,
} from '@radix-ui/react-icons';
import { Avatar, Flex, IconButton, Text } from '@radix-ui/themes';

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
import { BackButton } from './BackButton';
import { SearchBar } from './SearchBar';

type Props = {
    item?: MediaItem | null;
    onBack: () => void;
};

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

export function PlaylistPicker({ item, onBack }: Props) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const target = useMemo(() => resolveTrackPlaylistTarget(item), [item]);
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
                setLoading(true);
                setError(null);

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

    const rows = useMemo(() => {
        const likedRow = {
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

        const playlistRows = catalog.map((playlist) => ({
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
        }));

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

    return (
        <Flex
            direction="column"
            className="w-full max-w-full min-w-0 overflow-hidden"
            style={{ maxWidth: '100%', boxSizing: 'border-box' }}
        >
            <Flex
                align="center"
                gap="1"
                className="w-full max-w-full min-w-0 px-1 pt-1 pb-1"
            >
                <BackButton
                    aria-label="Back to actions"
                    className="shrink-0"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onBack();
                    }}
                />
                <div className="min-w-0 flex-1 basis-0 overflow-hidden px-px">
                    <SearchBar
                        value={query}
                        onChange={setQuery}
                        onClear={() => setQuery('')}
                        placeholder="Search playlists"
                        size="1"
                        radius="full"
                        className="w-full min-w-0"
                        inputRef={inputRef}
                        leftSlot={
                            <IconButton
                                size="1"
                                variant="ghost"
                                aria-label="Search playlists"
                            >
                                <MagnifyingGlassIcon />
                            </IconButton>
                        }
                        rightSlot={
                            <IconButton
                                size="1"
                                variant="ghost"
                                onClick={() => setQuery('')}
                                aria-label="Clear playlist search"
                            >
                                <Cross2Icon />
                            </IconButton>
                        }
                    />
                </div>
            </Flex>
            <Flex
                direction="column"
                gap="0"
                className="mt-1 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto px-1 pb-1"
                style={{
                    maxHeight:
                        'min(15rem, calc(var(--radix-dropdown-menu-content-available-height, 16rem) - 2.5rem))',
                }}
            >
                {error && (
                    <Text
                        size="1"
                        color="gray"
                        className="px-2 py-2 wrap-break-word"
                    >
                        {error}
                    </Text>
                )}
                {loading && rows.length === 0 && (
                    <Text size="1" color="gray" className="px-2 py-2">
                        Loading playlists...
                    </Text>
                )}
                {!loading && rows.length === 0 && (
                    <Text size="1" color="gray" className="px-2 py-2">
                        No matches
                    </Text>
                )}
                {rows.map((row) => {
                    const disabled =
                        row.pending || row.loading || !row.editable;
                    const subtitle = row.isLiked
                        ? undefined
                        : row.editable
                          ? row.subtitle
                          : 'Read only';

                    return (
                        <Flex
                            key={row.id}
                            align="center"
                            gap="1"
                            className="w-full max-w-full min-w-0 overflow-hidden rounded-sm px-2 py-1.5 transition-colors hover:bg-white/4"
                            style={{
                                minHeight: '2.5rem',
                                boxSizing: 'border-box',
                            }}
                        >
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
                            <Flex
                                direction="column"
                                justify="center"
                                className="min-w-0 flex-1 overflow-hidden"
                            >
                                <Text
                                    size="1"
                                    weight="medium"
                                    className="truncate"
                                >
                                    {row.name}
                                </Text>
                                {subtitle && (
                                    <Text
                                        size="1"
                                        color="gray"
                                        className="truncate"
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Flex>
                            <PlaylistIndicator
                                active={row.contains}
                                loading={row.loading}
                                pending={row.pending}
                                disabled={disabled}
                                onClick={() => {
                                    void handleToggle(row.id, row.playlist);
                                }}
                            />
                        </Flex>
                    );
                })}
            </Flex>
        </Flex>
    );
}
