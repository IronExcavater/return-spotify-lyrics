import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Playlist,
    PlaylistedTrack,
    Track,
} from '@spotify/web-api-ts-sdk';
import { useLocation } from 'react-router-dom';

import { safeRequest } from '../../shared/async';
import { formatDurationLong } from '../../shared/date';
import { resolveMarket } from '../../shared/locale';
import { createLogger, logError } from '../../shared/logging';
import { playlistToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaActionGroup } from '../../shared/types';
import { FullPageDialog } from '../components/FullPageDialog';
import { MediaHero, type HeroData } from '../components/MediaHero';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { MediaShelf, type MediaShelfItem } from '../components/MediaShelf';
import { PlaylistDedupeDialog } from '../components/PlaylistDedupeDialog';
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import {
    ensurePlaylistContentStateLoaded,
    getCachedPlaylistContentState,
    loadPlaylistContentState,
    mapPlaylistContentItems,
    PLAYLIST_PAGE_SIZE,
    storePlaylistContentState,
    type PlaylistContentState,
} from '../data/playlistStore';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { buildMediaActions } from '../hooks/useMediaActions';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { playlistRouteStore, useRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';
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

const toPlaylistDetailsDraft = (
    playlist: Pick<
        Playlist<Track>,
        'name' | 'description' | 'public' | 'collaborative'
    >
): PlaylistDetailsDraft => ({
    name: playlist.name ?? '',
    description: playlist.description ?? '',
    isPublic: playlist.public === null ? null : Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
});

export function PlaylistView() {
    const location = useLocation();
    const { settings } = useSettings();
    const routeHistory = useHistory();
    const { profile } = useAuth();
    const market = resolveMarket(settings.locale);
    const locationState = location.state as MediaRouteState | null;
    const { state, restoring } = useRouteState<MediaRouteState>({
        locationState,
        store: playlistRouteStore,
        routeHistory,
        routePath: '/playlist',
    });
    const [data, setData] = useState<PlaylistViewState | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [dedupeOpen, setDedupeOpen] = useState(false);
    const [dedupeLoading, setDedupeLoading] = useState(false);
    const [dedupeRemoving, setDedupeRemoving] = useState(false);
    const [dedupeItems, setDedupeItems] = useState<PlaylistTrackItem[] | null>(
        null
    );
    const [detailsDraft, setDetailsDraft] =
        useState<PlaylistDetailsDraft | null>(null);
    const applyPlaylistState = useCallback((nextData: PlaylistViewState) => {
        setData(nextData);
        setDetailsDraft(toPlaylistDetailsDraft(nextData.playlist));
    }, []);

    const loadPlaylist = useCallback(
        async (playlistId: string, nextMarket: Market) => {
            setLoading(true);
            try {
                const nextData = await loadPlaylistContentState({
                    playlistId,
                    market: nextMarket,
                    locale: settings.locale,
                });
                applyPlaylistState(nextData);
            } catch (error) {
                logError(logger, 'Failed to load playlist', error);
            } finally {
                setLoading(false);
            }
        },
        [applyPlaylistState, settings.locale]
    );

    useEffect(() => {
        if (!state?.id || state.kind !== 'playlist') {
            setData(null);
            setDetailsDraft(null);
            setDedupeItems(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setDedupeItems(null);
        setLoading(true);
        void getCachedPlaylistContentState(state.id).then((cached) => {
            if (cancelled || !cached.entry) return;
            applyPlaylistState(cached.entry);
        });
        void loadPlaylist(state.id, market);
        return () => {
            cancelled = true;
        };
    }, [applyPlaylistState, loadPlaylist, market, state?.id, state?.kind]);

    const showInitialLoading = loading && !data;

    const loadMoreItems = useCallback(async () => {
        let offset: number | null = null;
        let snapshotId: string | undefined;
        let currentData: PlaylistViewState | null = null;
        setData((prev) => {
            if (!prev || prev.itemsLoadingMore || !prev.itemsHasMore)
                return prev;
            currentData = prev;
            offset = prev.itemsOffset;
            snapshotId = prev.snapshotId;
            return { ...prev, itemsLoadingMore: true };
        });
        if (offset == null || !state?.id || !currentData) return;
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
                    ...mapPlaylistContentItems(
                        pageItems,
                        settings.locale,
                        offset
                    ),
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
    }, [market, settings.locale, state?.id]);

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
    const scrollRef = useRef<HTMLDivElement | null>(null);

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
                  setEditOpen(true);
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
        setDetailsDraft({
            name: data.playlist.name ?? '',
            description: data.playlist.description ?? '',
            isPublic:
                data.playlist.public === null
                    ? null
                    : Boolean(data.playlist.public),
            isCollaborative: Boolean(data.playlist.collaborative),
        });
    }, [data]);

    const handleSaveDetails = useCallback(async () => {
        if (!data || !detailsDraft) return;
        setSaving(true);
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
            setEditOpen(false);
        } catch (error) {
            logError(logger, 'Failed to save playlist details', error);
        } finally {
            setSaving(false);
        }
    }, [data, detailsDraft]);

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
        setDedupeOpen(true);
        setDedupeLoading(true);
        setDedupeItems(data.itemsHasMore ? null : data.items);
        try {
            const complete = await ensurePlaylistContentStateLoaded({
                playlistId: state.id,
                market,
                locale: settings.locale,
                base: data,
            });
            setDedupeItems(complete.items);
        } catch (error) {
            logError(logger, 'Failed to prepare playlist dedupe', error);
            setDedupeItems(data.items);
        } finally {
            setDedupeLoading(false);
        }
    }, [canEdit, data, market, settings.locale, state?.id]);

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

            setDedupeRemoving(true);
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
                setDedupeItems(null);
                setDedupeOpen(false);
            } catch (error) {
                logError(
                    logger,
                    'Failed to remove duplicate playlist items',
                    error
                );
            } finally {
                setDedupeRemoving(false);
            }
        },
        [data, loadPlaylist, market, state?.id]
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
        if (restoring) {
            return (
                <Flex p="3" direction="column" gap="2">
                    <SkeletonText loading variant="title">
                        <Text size="5" weight="bold" />
                    </SkeletonText>
                    <SkeletonText loading variant="subtitle">
                        <Text size="2" color="gray" />
                    </SkeletonText>
                </Flex>
            );
        }
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    Select a playlist to view details.
                </Text>
            </Flex>
        );
    }

    if (!loading && !data) {
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    This playlist is not available yet.
                </Text>
            </Flex>
        );
    }

    return (
        <StickyLayout.Root
            className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 flex-col overflow-y-auto"
            scrollRef={scrollRef}
        >
            <StickyLayout.Sticky order={0} className="z-10" heightOffset={8}>
                <MediaHero
                    hero={hero}
                    loading={showInitialLoading}
                    heroUrl={hero?.heroUrl}
                    scrollRef={scrollRef}
                    collapseKey={viewKey}
                    resetScroll={false}
                    mergedHeroActions={mergedHeroActions}
                    canTogglePlayback={canTogglePlayback}
                    sticky={false}
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
                />
            </StickyLayout.Sticky>

            <StickyLayout.Body>
                <div className="bg-background absolute -top-2 z-10 h-2 w-full shrink-0" />
                <Flex pl="3" pr="1" direction="column" gap="3">
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
                                    const playlistItem =
                                        item as PlaylistTrackItem;
                                    return {
                                        showPosition: true,
                                        position: playlistItem.playlistIndex,
                                    };
                                }}
                            />
                        )}
                    />
                </Flex>
            </StickyLayout.Body>

            <FullPageDialog
                open={editOpen}
                onOpenChange={setEditOpen}
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
                                    setDetailsDraft((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  name: event.target.value,
                                              }
                                            : prev
                                    )
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
                                    setDetailsDraft((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  description:
                                                      event.target.value,
                                              }
                                            : prev
                                    )
                                }
                            />
                        </Flex>
                        <Flex gap="4" wrap="wrap">
                            <Flex align="center" gap="2">
                                <Switch
                                    checked={detailsDraft.isPublic ?? false}
                                    disabled={saving}
                                    onCheckedChange={(value) =>
                                        setDetailsDraft((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      isPublic: value,
                                                  }
                                                : prev
                                        )
                                    }
                                />
                                <Text size="2">Public</Text>
                            </Flex>
                            <Flex align="center" gap="2">
                                <Switch
                                    checked={detailsDraft.isCollaborative}
                                    disabled={saving}
                                    onCheckedChange={(value) =>
                                        setDetailsDraft((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      isCollaborative: value,
                                                  }
                                                : prev
                                        )
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
                                    setEditOpen(false);
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
                onOpenChange={setDedupeOpen}
                analysis={dedupeAnalysis}
                loading={dedupeLoading}
                removing={dedupeRemoving}
                onConfirm={handleRemoveDuplicates}
            />
        </StickyLayout.Root>
    );
}
