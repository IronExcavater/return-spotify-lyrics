import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button,
    Flex,
    Switch,
    Text,
    TextArea,
    TextField,
} from '@radix-ui/themes';
import type {
    Episode,
    Market,
    Page,
    PlaylistedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';

import { safeRequest } from '../../shared/async';
import { formatDurationLong } from '../../shared/date';
import { resolveLocale, resolveMarket } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import { playlistToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaActionGroup } from '../../shared/types';
import { DetailViewLayout } from '../components/DetailViewLayout';
import {
    DetailViewLoadingState,
    DetailViewMessage,
} from '../components/DetailViewState';
import { FullPageDialog } from '../components/FullPageDialog';
import { type HeroData } from '../components/MediaHero';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf } from '../components/MediaShelf';
import { PlaylistDedupeDialog } from '../components/PlaylistDedupeDialog';
import { SkeletonText } from '../components/SkeletonText';
import {
    ensurePlaylistContentStateLoaded,
    getCachedPlaylistContentState,
    loadPlaylistContentState,
    mapPlaylistContentItems,
    PLAYLIST_PAGE_SIZE,
    storePlaylistContentState,
    type PlaylistContentState,
    type PlaylistWithNullablePublic,
} from '../data/playlistStore';
import { useAuth } from '../hooks/useAuth';
import { buildMediaActions } from '../hooks/useMediaActions';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import {
    playlistRouteStore,
    useStoredRouteState,
} from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';
import type { MediaShelfItem } from '../types/mediaShelf';
import { sumDurationMs } from '../utils/mediaLookup';
import {
    analyzePlaylistDuplicates,
    type PlaylistDedupableItem,
} from '../utils/playlistDuplicates';

const logger = createLogger('playlist');
const emptyPlaylistPage = (offset = 0): Page<PlaylistedTrack<Track>> => ({
    href: '',
    items: [],
    limit: PLAYLIST_PAGE_SIZE,
    next: null,
    offset,
    previous: null,
    total: 0,
});

type PlaylistViewState = PlaylistContentState;

type PlaylistTrackItem = PlaylistDedupableItem;

type PlaylistDetailsDraft = {
    name: string;
    description: string;
    isPublic: boolean | null;
    isCollaborative: boolean;
};

type PlaylistDialogsState = {
    editOpen: boolean;
    dedupeOpen: boolean;
    dedupeLoading: boolean;
    dedupeRemoving: boolean;
};

type PlaylistUiState = {
    loading: boolean;
    saving: boolean;
    dialogs: PlaylistDialogsState;
    dedupeItems: PlaylistTrackItem[] | null;
    detailsDraft: PlaylistDetailsDraft | null;
};

const DEFAULT_DIALOGS: PlaylistDialogsState = {
    editOpen: false,
    dedupeOpen: false,
    dedupeLoading: false,
    dedupeRemoving: false,
};

const INITIAL_UI_STATE: PlaylistUiState = {
    loading: true,
    saving: false,
    dialogs: DEFAULT_DIALOGS,
    dedupeItems: null,
    detailsDraft: null,
};

const toPlaylistDetailsDraft = (
    playlist: Pick<
        PlaylistWithNullablePublic,
        'name' | 'description' | 'public' | 'collaborative'
    >
): PlaylistDetailsDraft => ({
    name: playlist.name ?? '',
    description: playlist.description ?? '',
    isPublic: playlist.public === null ? null : Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
});

export function PlaylistView() {
    const { settings } = useSettings();
    const { profile } = useAuth();
    const locale = resolveLocale(settings.locale);
    const market = resolveMarket(settings.locale);
    const { state, restoring } = useStoredRouteState<MediaRouteState>({
        store: playlistRouteStore,
        routePath: '/playlist',
    });
    const [data, setData] = useState<PlaylistViewState | null>(null);
    const [uiState, setUiState] = useState<PlaylistUiState>(INITIAL_UI_STATE);
    const updateUiState = useCallback(
        (updater: (previous: PlaylistUiState) => PlaylistUiState) => {
            setUiState((previous) => {
                const next = updater(previous);
                return Object.is(previous, next) ? previous : next;
            });
        },
        []
    );
    const patchUiState = useCallback(
        (patch: Partial<PlaylistUiState>) => {
            updateUiState((previous) => ({ ...previous, ...patch }));
        },
        [updateUiState]
    );
    const patchDialogs = useCallback(
        (patch: Partial<PlaylistDialogsState>) => {
            updateUiState((previous) => ({
                ...previous,
                dialogs: {
                    ...previous.dialogs,
                    ...patch,
                },
            }));
        },
        [updateUiState]
    );
    const applyPlaylistState = useCallback(
        (nextData: PlaylistViewState) => {
            setData(nextData);
            patchUiState({
                detailsDraft: toPlaylistDetailsDraft(nextData.playlist),
            });
        },
        [patchUiState]
    );
    const { loading, saving, detailsDraft, dedupeItems, dialogs } = uiState;
    const { editOpen, dedupeOpen, dedupeLoading, dedupeRemoving } = dialogs;

    const loadPlaylist = useCallback(
        async (playlistId: string, nextMarket: Market) => {
            patchUiState({ loading: true });
            try {
                const nextData = await loadPlaylistContentState({
                    playlistId,
                    market: nextMarket,
                    locale,
                });
                applyPlaylistState(nextData);
            } catch (error) {
                logError(logger, 'Failed to load playlist', error);
            } finally {
                patchUiState({ loading: false });
            }
        },
        [applyPlaylistState, locale, patchUiState]
    );

    useEffect(() => {
        if (!state?.id || state.kind !== 'playlist') {
            setData(null);
            patchUiState({
                loading: false,
                saving: false,
                detailsDraft: null,
                dedupeItems: null,
                dialogs: DEFAULT_DIALOGS,
            });
            return;
        }
        let cancelled = false;
        patchUiState({
            loading: true,
            saving: false,
            dedupeItems: null,
            dialogs: DEFAULT_DIALOGS,
        });
        void getCachedPlaylistContentState(state.id).then((cached) => {
            if (cancelled || !cached.entry) return;
            applyPlaylistState(cached.entry);
        });
        void loadPlaylist(state.id, market);
        return () => {
            cancelled = true;
        };
    }, [
        applyPlaylistState,
        loadPlaylist,
        market,
        patchUiState,
        state?.id,
        state?.kind,
    ]);

    const showInitialLoading = loading && !data;

    const loadMoreItems = useCallback(async () => {
        const currentData = data;
        if (
            !currentData ||
            currentData.itemsLoadingMore ||
            !currentData.itemsHasMore
        ) {
            return;
        }
        if (!state?.id) return;

        const offset = currentData.itemsOffset;
        const snapshotId = currentData.snapshotId;

        setData((prev) =>
            prev && prev.itemsOffset === offset
                ? { ...prev, itemsLoadingMore: true }
                : prev
        );
        try {
            const page = await safeRequest(
                () =>
                    sendSpotifyMessage('getPlaylistItems', {
                        id: state.id,
                        market,
                        limit: PLAYLIST_PAGE_SIZE,
                        offset,
                    }),
                emptyPlaylistPage(offset),
                (error) =>
                    logError(
                        logger,
                        'Failed to load more playlist items',
                        error
                    )
            );
            const pageItems = page?.items ?? [];
            const tracks = pageItems
                .map((entry) => entry.track)
                .filter(Boolean) as Array<Track | Episode>;
            const nextOffset = offset + pageItems.length;
            const hasMore = nextOffset < (page?.total ?? nextOffset);
            const nextData = await storePlaylistContentState({
                playlist: currentData.playlist,
                items: [
                    ...currentData.items,
                    ...mapPlaylistContentItems(pageItems, locale, offset),
                ],
                totalDurationMs:
                    currentData.totalDurationMs + sumDurationMs(tracks),
                itemsOffset: nextOffset,
                itemsHasMore: hasMore,
                itemsLoadingMore: false,
                snapshotId: snapshotId ?? currentData.snapshotId,
            });
            setData((prev) =>
                prev && prev.itemsOffset === offset ? nextData : prev
            );
        } catch (error) {
            logError(logger, 'Failed to load more playlist items', error);
            setData((prev) =>
                prev ? { ...prev, itemsLoadingMore: false } : prev
            );
        }
    }, [data, locale, market, state?.id]);

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

    const hero = useMemo<HeroData | null>(() => {
        if (!data) return null;
        const duration = formatDurationLong(data.totalDurationMs);
        const trackCount = data.playlist.tracks.total;
        const infoParts = [`${trackCount} tracks`].filter(Boolean);
        return {
            title: data.playlist.name,
            subtitle: data.playlist.owner?.display_name,
            info: infoParts.join(' • '),
            imageUrl: data.playlist.images?.[0]?.url,
            heroUrl: data.playlist.images?.[0]?.url,
            duration,
            item: playlistToItem(data.playlist),
        };
    }, [data]);

    const viewKey = state?.id ?? 'playlist';

    const isOwner =
        data?.playlist.owner?.id && profile?.id
            ? data.playlist.owner.id === profile.id
            : false;
    const canEdit = isOwner || Boolean(data?.playlist.collaborative);

    const heroActions: MediaActionGroup | null = hero
        ? buildMediaActions(hero.item)
        : null;
    const canOpenDedupe =
        canEdit &&
        !showInitialLoading &&
        !dedupeLoading &&
        !dedupeRemoving &&
        (data?.items.length ?? 0) > 0;
    const editAction = canEdit
        ? {
              id: 'edit-playlist',
              label: 'Edit details',
              shortcut: 'E',
              onSelect: () => {
                  resetDetailsDraft();
                  patchDialogs({ editOpen: true });
              },
          }
        : null;
    const dedupeAction = canOpenDedupe
        ? {
              id: 'find-playlist-duplicates',
              label: 'Find duplicates',
              onSelect: () => {
                  void openDedupeDialog();
              },
          }
        : null;
    const mergedHeroActions = heroActions
        ? {
              primary: heroActions.primary,
              secondary: [
                  ...heroActions.secondary,
                  ...(editAction ? [editAction] : []),
                  ...(dedupeAction ? [dedupeAction] : []),
              ],
          }
        : null;
    const playNowAction = heroActions?.primary.find(
        (action) => action.id === 'play-now'
    );
    const canTogglePlayback = Boolean(hero?.item?.uri);

    const resetDetailsDraft = useCallback(() => {
        if (!data) return;
        patchUiState({
            detailsDraft: {
                name: data.playlist.name ?? '',
                description: data.playlist.description ?? '',
                isPublic:
                    data.playlist.public === null
                        ? null
                        : Boolean(data.playlist.public),
                isCollaborative: Boolean(data.playlist.collaborative),
            },
        });
    }, [data, patchUiState]);
    const updateDetailsDraft = useCallback(
        (updater: (previous: PlaylistDetailsDraft) => PlaylistDetailsDraft) => {
            patchUiState({
                detailsDraft: detailsDraft ? updater(detailsDraft) : null,
            });
        },
        [detailsDraft, patchUiState]
    );

    const handleSaveDetails = useCallback(async () => {
        if (!data || !detailsDraft) return;
        patchUiState({ saving: true });
        try {
            await sendSpotifyMessage('changePlaylistDetails', {
                id: data.playlist.id,
                name: detailsDraft.name,
                description: detailsDraft.description,
                public: detailsDraft.isPublic,
                collaborative: detailsDraft.isCollaborative,
            });
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          playlist: {
                              ...prev.playlist,
                              name: detailsDraft.name,
                              description: detailsDraft.description,
                              public: detailsDraft.isPublic,
                              collaborative: detailsDraft.isCollaborative,
                          },
                      }
                    : prev
            );
            patchDialogs({ editOpen: false });
        } catch (error) {
            logError(logger, 'Failed to save playlist details', error);
        } finally {
            patchUiState({ saving: false });
        }
    }, [data, detailsDraft, patchDialogs, patchUiState]);

    const handleReorder = useCallback(
        (
            next: MediaShelfItem[],
            context?: { sourceIndex: number; destinationIndex: number }
        ) => {
            const previousItems = data?.items ?? [];
            setData((prev) =>
                prev ? { ...prev, items: next as PlaylistTrackItem[] } : prev
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
                    setData((prev) =>
                        prev
                            ? { ...prev, snapshotId: result.snapshot_id }
                            : prev
                    );
                } catch (error) {
                    logError(logger, 'Failed to reorder playlist items', error);
                    setData((prev) =>
                        prev ? { ...prev, items: previousItems } : prev
                    );
                }
            })();
        },
        [canEdit, data]
    );

    const handleRemoveItem = useCallback(
        async (item: MediaShelfItem) => {
            if (!data || !item.uri) return;
            try {
                await sendSpotifyMessage('removePlaylistItems', {
                    id: data.playlist.id,
                    uris: [item.uri],
                    snapshotId: data.snapshotId,
                });
                if (state?.id) {
                    await loadPlaylist(state.id, market);
                }
            } catch (error) {
                logError(logger, 'Failed to remove playlist item', error);
            }
        },
        [data, loadPlaylist, market, state?.id]
    );

    const dedupeAnalysis = useMemo(
        () => analyzePlaylistDuplicates(dedupeItems ?? data?.items ?? []),
        [data?.items, dedupeItems]
    );

    const openDedupeDialog = useCallback(async () => {
        if (!data || !canEdit || !state?.id) return;
        patchUiState({
            dedupeItems: data.itemsHasMore ? null : data.items,
        });
        patchDialogs({ dedupeOpen: true, dedupeLoading: true });
        try {
            const complete = await ensurePlaylistContentStateLoaded({
                playlistId: state.id,
                market,
                locale,
                base: data,
            });
            patchUiState({ dedupeItems: complete.items });
        } catch (error) {
            logError(logger, 'Failed to prepare playlist dedupe', error);
            patchUiState({ dedupeItems: data.items });
        } finally {
            patchDialogs({ dedupeLoading: false });
        }
    }, [canEdit, data, market, patchDialogs, patchUiState, locale, state?.id]);

    const handleRemoveDuplicates = useCallback(
        async (items: PlaylistDedupableItem[]) => {
            if (!data || items.length === 0) return;

            const tracksByUri = new Map<string, number[]>();
            items.forEach((item) => {
                const uri = item.playlistTrackUri ?? item.uri;
                if (!uri) return;
                const positions = tracksByUri.get(uri) ?? [];
                positions.push(item.playlistIndex);
                tracksByUri.set(uri, positions);
            });

            if (tracksByUri.size === 0) return;

            patchDialogs({ dedupeRemoving: true });
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
                if (state?.id) {
                    await loadPlaylist(state.id, market);
                }
                patchUiState({ dedupeItems: null });
                patchDialogs({ dedupeOpen: false });
            } catch (error) {
                logError(
                    logger,
                    'Failed to remove duplicate playlist items',
                    error
                );
            } finally {
                patchDialogs({ dedupeRemoving: false });
            }
        },
        [data, loadPlaylist, market, patchDialogs, patchUiState, state?.id]
    );

    const getItemActions = useCallback(
        (item: MediaShelfItem) => {
            const base = buildMediaActions(item);
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
                            void handleRemoveItem(item);
                        },
                    },
                ],
            };
        },
        [canEdit, handleRemoveItem]
    );

    const reorderEnabled = canEdit && !showInitialLoading;
    const trimmedDescription = data?.playlist.description?.trim() ?? '';
    const trackItems = data?.items ?? [];
    const trackTotalCount = data?.playlist.tracks.total;
    const trackHasMore = data?.itemsHasMore;
    const trackLoadingMore = data?.itemsLoadingMore;
    const tracksSection = {
        id: 'playlist-tracks',
        title: 'Tracks',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        items: trackItems,
        totalCount: trackTotalCount,
        hasMore: trackHasMore,
        loadingMore: trackLoadingMore,
    } satisfies MediaSectionState;

    if (!state) {
        if (restoring) return <DetailViewLoadingState />;

        return (
            <DetailViewMessage message="Select a playlist to view details." />
        );
    }

    if (!loading && !data) {
        return (
            <DetailViewMessage message="This playlist is not available yet." />
        );
    }

    return (
        <>
            <DetailViewLayout
                hero={hero}
                loading={showInitialLoading}
                heroUrl={hero?.heroUrl}
                collapseKey={viewKey}
                resetScroll={false}
                mergedHeroActions={mergedHeroActions}
                canTogglePlayback={canTogglePlayback}
                onPlay={() => {
                    if (playNowAction) {
                        playNowAction.onSelect();
                        return;
                    }

                    const contextUri = hero?.item?.uri;
                    if (!contextUri) return;

                    void sendSpotifyMessage('startPlayback', {
                        contextUri,
                    });
                }}
                contentGap="3"
            >
                {(showInitialLoading || trimmedDescription.length > 0) && (
                    <Flex direction="column" gap="1" pt="2">
                        <Text size="1" color="gray">
                            Description
                        </Text>
                        {showInitialLoading ? (
                            <Flex
                                direction="column"
                                gap="1"
                                className="max-w-120"
                            >
                                <SkeletonText
                                    loading
                                    variant="subtitle"
                                    fullWidth={false}
                                >
                                    <Text size="2" />
                                </SkeletonText>
                                <SkeletonText
                                    loading
                                    variant="subtitle"
                                    fullWidth={false}
                                    seed={1}
                                >
                                    <Text size="2" />
                                </SkeletonText>
                            </Flex>
                        ) : (
                            <Text size="2">{trimmedDescription}</Text>
                        )}
                    </Flex>
                )}

                <MediaSection
                    editing={false}
                    loading={showInitialLoading}
                    section={tracksSection}
                    onChange={() => undefined}
                    renderContent={({ loading: sectionLoading }) => (
                        <MediaShelf
                            items={trackItems}
                            variant="list"
                            orientation="vertical"
                            itemsPerColumn={6}
                            enablePrimaryPlay
                            draggable={reorderEnabled}
                            interactive={!sectionLoading}
                            itemLoading={sectionLoading}
                            totalCount={trackTotalCount}
                            hasMore={trackHasMore}
                            loadingMore={trackLoadingMore}
                            onLoadMore={loadMoreItems}
                            onReorder={handleReorder}
                            getActions={getItemActions}
                            getRowProps={(item) => {
                                const playlistItem = item as PlaylistTrackItem;

                                return {
                                    showPosition: true,
                                    position: playlistItem.playlistIndex,
                                };
                            }}
                        />
                    )}
                />
            </DetailViewLayout>
            <FullPageDialog
                open={editOpen}
                onOpenChange={(nextOpen) =>
                    patchDialogs({ editOpen: nextOpen })
                }
                title="Edit playlist"
                description="Update the title, description, and visibility settings."
            >
                {detailsDraft && (
                    <Flex direction="column" gap="3">
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray">
                                Title
                            </Text>
                            <TextField.Root
                                value={detailsDraft.name}
                                disabled={saving}
                                onChange={(event) =>
                                    updateDetailsDraft((previous) => ({
                                        ...previous,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </Flex>
                        <Flex direction="column" gap="1">
                            <Text size="1" color="gray">
                                Description
                            </Text>
                            <TextArea
                                value={detailsDraft.description}
                                disabled={saving}
                                resize="vertical"
                                rows={6}
                                onChange={(event) =>
                                    updateDetailsDraft((previous) => ({
                                        ...previous,
                                        description: event.target.value,
                                    }))
                                }
                            />
                        </Flex>
                        <Flex gap="4" wrap="wrap">
                            <Flex align="center" gap="2">
                                <Switch
                                    checked={detailsDraft.isPublic ?? false}
                                    disabled={saving}
                                    onCheckedChange={(value) =>
                                        updateDetailsDraft((previous) => ({
                                            ...previous,
                                            isPublic: value,
                                        }))
                                    }
                                />
                                <Text size="2">Public</Text>
                            </Flex>
                            <Flex align="center" gap="2">
                                <Switch
                                    checked={detailsDraft.isCollaborative}
                                    disabled={saving}
                                    onCheckedChange={(value) =>
                                        updateDetailsDraft((previous) => ({
                                            ...previous,
                                            isCollaborative: value,
                                        }))
                                    }
                                />
                                <Text size="2">Collaborative</Text>
                            </Flex>
                        </Flex>
                        <Flex justify="end" gap="2">
                            <Button
                                size="1"
                                variant="soft"
                                disabled={saving}
                                onClick={() => {
                                    resetDetailsDraft();
                                    patchDialogs({ editOpen: false });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="1"
                                variant="solid"
                                disabled={saving}
                                onClick={handleSaveDetails}
                            >
                                {saving ? 'Saving...' : 'Save changes'}
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </FullPageDialog>
            <PlaylistDedupeDialog
                open={dedupeOpen}
                onOpenChange={(nextOpen) =>
                    patchDialogs({ dedupeOpen: nextOpen })
                }
                analysis={dedupeAnalysis}
                loading={dedupeLoading}
                removing={dedupeRemoving}
                onConfirm={handleRemoveDuplicates}
            />
        </>
    );
}
