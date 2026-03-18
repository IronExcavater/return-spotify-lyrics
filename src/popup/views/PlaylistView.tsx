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
import { episodeToItem, playlistToItem, trackToItem } from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import type { MediaItem, MediaActionGroup } from '../../shared/types';
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
const PLAYLIST_PAGE_SIZE = 50;
const emptyPlaylistPage = (offset = 0): Page<PlaylistedTrack<Track>> => ({
    href: '',
    items: [],
    limit: PLAYLIST_PAGE_SIZE,
    next: null,
    offset,
    previous: null,
    total: 0,
});

type PlaylistViewState = {
    playlist: Playlist<Track>;
    items: PlaylistTrackItem[];
    totalDurationMs: number;
    itemsOffset: number;
    itemsHasMore: boolean;
    itemsLoadingMore: boolean;
    snapshotId?: string;
};

type PlaylistTrackItem = PlaylistDedupableItem;

type PlaylistDetailsDraft = {
    name: string;
    description: string;
    isPublic: boolean | null;
    isCollaborative: boolean;
};

const createPlaylistItemKey = (entry: PlaylistedTrack, index: number) => {
    const base =
        entry.track?.uri ?? entry.track?.id ?? entry.track?.name ?? 'track';
    const added = entry.added_at ?? 'unknown';
    return `${base}:${added}:${index}`;
};

const mapPlaylistItems = (
    entries: Array<PlaylistedTrack> = [],
    locale: string,
    offset: number
): PlaylistTrackItem[] => {
    const safeEntries = Array.isArray(entries) ? entries : [];
    return safeEntries.map((entry, index) => {
        const track = entry.track;
        const item: MediaItem | null = track
            ? track.type === 'episode'
                ? episodeToItem(track as Episode, locale)
                : trackToItem(track as Track)
            : null;
        if (!item) {
            return {
                id: `missing-${offset + index}`,
                title: 'Unavailable',
                subtitle: 'Track removed',
                listKey: `missing-${offset + index}`,
                kind: 'track' as const,
                playlistIndex: offset + index,
                addedAt: entry.added_at ?? undefined,
            };
        }
        return {
            ...item,
            listKey: createPlaylistItemKey(entry, offset + index),
            playlistIndex: offset + index,
            playlistTrackId:
                track && track.type === 'track'
                    ? (track as Track).id
                    : undefined,
            playlistTrackUri: track?.uri ?? undefined,
            addedAt: entry.added_at ?? undefined,
        };
    });
};

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
    const skeletonLabel = '\u00A0';
    const skeletonTracks = useMemo(
        () =>
            Array.from({ length: 10 }, (_, index) => ({
                id: `skeleton-${index}`,
                title: skeletonLabel,
                subtitle: skeletonLabel,
            })),
        [skeletonLabel]
    );
    const [saving, setSaving] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [dedupeOpen, setDedupeOpen] = useState(false);
    const [dedupeLoading, setDedupeLoading] = useState(false);
    const [dedupeRemoving, setDedupeRemoving] = useState(false);
    const [detailsDraft, setDetailsDraft] =
        useState<PlaylistDetailsDraft | null>(null);

    const loadPlaylist = useCallback(
        async (playlistId: string, nextMarket: Market) => {
            setLoading(true);
            try {
                const playlist = await sendSpotifyMessage('getPlaylist', {
                    id: playlistId,
                    market: nextMarket,
                });
                const pageItems = Array.isArray(playlist.tracks?.items)
                    ? playlist.tracks.items
                    : [];
                const tracks = pageItems
                    .map((entry) => entry.track)
                    .filter(Boolean) as Array<Track | Episode>;
                const totalDurationMs = sumDurationMs(tracks);
                const items = mapPlaylistItems(pageItems, settings.locale, 0);
                const nextOffset = pageItems.length;
                const totalItems = playlist.tracks?.total ?? nextOffset;
                const hasMore = nextOffset < totalItems;
                setData({
                    playlist,
                    items,
                    totalDurationMs,
                    itemsOffset: nextOffset,
                    itemsHasMore: hasMore,
                    itemsLoadingMore: false,
                    snapshotId: playlist.snapshot_id,
                });
                setDetailsDraft({
                    name: playlist.name ?? '',
                    description: playlist.description ?? '',
                    isPublic:
                        playlist.public === null
                            ? null
                            : Boolean(playlist.public),
                    isCollaborative: Boolean(playlist.collaborative),
                });
            } catch (error) {
                logError(logger, 'Failed to load playlist', error);
                setData(null);
            } finally {
                setLoading(false);
            }
        },
        [settings.locale]
    );

    useEffect(() => {
        if (!state?.id || state.kind !== 'playlist') {
            setData(null);
            setLoading(false);
            return;
        }
        void loadPlaylist(state.id, market);
    }, [loadPlaylist, market, state?.id, state?.kind]);

    const loadMoreItems = useCallback(async () => {
        let offset: number | null = null;
        setData((prev) => {
            if (!prev || prev.itemsLoadingMore || !prev.itemsHasMore)
                return prev;
            offset = prev.itemsOffset;
            return { ...prev, itemsLoadingMore: true };
        });
        if (offset == null || !state?.id) return;
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
            const addedDuration = sumDurationMs(tracks);
            const mapped = mapPlaylistItems(pageItems, settings.locale, offset);
            setData((prev) => {
                if (!prev || prev.itemsOffset !== offset) return prev;
                const nextOffset = offset + pageItems.length;
                const hasMore = nextOffset < (page?.total ?? nextOffset);
                return {
                    ...prev,
                    items: [...prev.items, ...mapped],
                    totalDurationMs: prev.totalDurationMs + addedDuration,
                    itemsOffset: nextOffset,
                    itemsHasMore: hasMore,
                    itemsLoadingMore: false,
                };
            });
        } catch (error) {
            logError(logger, 'Failed to load more playlist items', error);
            setData((prev) =>
                prev ? { ...prev, itemsLoadingMore: false } : prev
            );
        }
    }, [market, settings.locale, state?.id]);

    const ensureAllPlaylistItemsLoaded = useCallback(async () => {
        if (!data || !state?.id || !data.itemsHasMore) return data?.items ?? [];

        let offset = data.itemsOffset;
        let nextItems = [...data.items];
        let totalDurationMs = data.totalDurationMs;
        let hasMore: boolean = data.itemsHasMore;

        setData((prev) => (prev ? { ...prev, itemsLoadingMore: true } : prev));

        try {
            while (hasMore) {
                const page = await sendSpotifyMessage('getPlaylistItems', {
                    id: state.id,
                    market,
                    limit: PLAYLIST_PAGE_SIZE,
                    offset,
                });
                const pageItems = page.items ?? [];
                const tracks = pageItems
                    .map((entry) => entry.track)
                    .filter(Boolean) as Array<Track | Episode>;
                totalDurationMs += sumDurationMs(tracks);
                nextItems = [
                    ...nextItems,
                    ...mapPlaylistItems(pageItems, settings.locale, offset),
                ];
                offset += pageItems.length;
                hasMore = offset < (page.total ?? offset);
                if (pageItems.length === 0) break;
            }

            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          items: nextItems,
                          totalDurationMs,
                          itemsOffset: offset,
                          itemsHasMore: hasMore,
                          itemsLoadingMore: false,
                      }
                    : prev
            );

            return nextItems;
        } catch (error) {
            logError(logger, 'Failed to load full playlist for dedupe', error);
            setData((prev) =>
                prev ? { ...prev, itemsLoadingMore: false } : prev
            );
            return data.items;
        }
    }, [data, market, settings.locale, state?.id]);

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
        !loading &&
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
        () => analyzePlaylistDuplicates(data?.items ?? []),
        [data?.items]
    );

    const openDedupeDialog = useCallback(async () => {
        if (!data || !canEdit) return;
        setDedupeOpen(true);
        setDedupeLoading(true);
        try {
            await ensureAllPlaylistItemsLoaded();
        } finally {
            setDedupeLoading(false);
        }
    }, [canEdit, data, ensureAllPlaylistItemsLoaded]);

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

    const reorderEnabled = canEdit && !loading;
    const tracksSection = {
        id: 'playlist-tracks',
        title: 'Tracks',
        view: 'list',
        infinite: 'rows',
        rows: 0,
        items: loading ? skeletonTracks : (data?.items ?? []),
        hasMore: loading ? false : data?.itemsHasMore,
        loadingMore: loading ? false : data?.itemsLoadingMore,
    } satisfies MediaSectionState;

    if (!state) {
        if (restoring) {
            return (
                <Flex p="3" direction="column" gap="2">
                    <SkeletonText
                        loading
                        parts={[skeletonLabel]}
                        preset="media-row"
                        variant="title"
                    >
                        <Text size="5" weight="bold">
                            {skeletonLabel}
                        </Text>
                    </SkeletonText>
                    <SkeletonText
                        loading
                        parts={[skeletonLabel]}
                        preset="media-row"
                        variant="subtitle"
                    >
                        <Text size="2" color="gray">
                            {skeletonLabel}
                        </Text>
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
                    loading={loading}
                    heroUrl={hero?.heroUrl}
                    scrollRef={scrollRef}
                    collapseKey={viewKey}
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
                <Flex pl="3" direction="column" gap="3">
                    {data?.playlist.description?.trim().length ? (
                        <Flex direction="column" gap="1" pt="2">
                            <Text size="1" color="gray">
                                Description
                            </Text>
                            <Text size="2">{data.playlist.description}</Text>
                        </Flex>
                    ) : null}

                    <MediaSection
                        editing={false}
                        loading={loading}
                        section={tracksSection}
                        onChange={() => undefined}
                        renderContent={() => (
                            <MediaShelf
                                items={tracksSection.items}
                                variant="list"
                                orientation="vertical"
                                itemsPerColumn={6}
                                draggable={reorderEnabled}
                                interactive={!loading}
                                itemLoading={loading}
                                hasMore={tracksSection.hasMore}
                                loadingMore={tracksSection.loadingMore}
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
