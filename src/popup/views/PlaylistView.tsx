import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Button,
    Dialog,
    Flex,
    Switch,
    Text,
    TextField,
    TextArea,
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
import { MediaHero, type HeroData } from '../components/MediaHero';
import { MediaShelf, type MediaShelfItem } from '../components/MediaShelf';
import { SkeletonText } from '../components/SkeletonText';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { buildMediaActions } from '../hooks/useMediaActions';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { playlistRouteStore, useRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';
import { sumDurationMs } from '../utils/mediaLookup';

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
    items: MediaShelfItem[];
    totalDurationMs: number;
    itemsOffset: number;
    itemsHasMore: boolean;
    itemsLoadingMore: boolean;
    snapshotId?: string;
};

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
) => {
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
            };
        }
        return {
            ...item,
            listKey: createPlaylistItemKey(entry, offset + index),
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
    const [saving, setSaving] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
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
    const heroStickyRef = useRef<HTMLDivElement | null>(null);
    const lastScrollTopRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const heroProgressRef = useRef(0);

    useEffect(() => {
        lastScrollTopRef.current = 0;
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        heroStickyRef.current?.style.setProperty('--hero-collapse', '0');
        heroProgressRef.current = 0;
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [viewKey]);

    const handleScroll = () => {
        const node = scrollRef.current;
        if (!node) return;
        lastScrollTopRef.current = node.scrollTop;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const progress = Math.min(
                1,
                Math.max(0, lastScrollTopRef.current / 8)
            );
            if (Math.abs(progress - heroProgressRef.current) < 0.001) return;
            heroProgressRef.current = progress;
            heroStickyRef.current?.style.setProperty(
                '--hero-collapse',
                String(progress)
            );
        });
    };

    const isOwner =
        data?.playlist.owner?.id && profile?.id
            ? data.playlist.owner.id === profile.id
            : false;
    const canEdit = isOwner || Boolean(data?.playlist.collaborative);

    const heroActions: MediaActionGroup | null = hero
        ? buildMediaActions(hero.item)
        : null;
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
    const mergedHeroActions = heroActions
        ? {
              primary: heroActions.primary,
              secondary: editAction
                  ? [...heroActions.secondary, editAction]
                  : heroActions.secondary,
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
            setData((prev) => (prev ? { ...prev, items: next } : prev));
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
        <Flex
            direction="column"
            className="no-overflow-anchor scrollbar-gutter-stable min-h-0 overflow-y-auto"
            ref={scrollRef}
            onScroll={handleScroll}
        >
            <MediaHero
                hero={hero}
                loading={loading}
                heroUrl={hero?.heroUrl}
                heroRef={heroStickyRef}
                mergedHeroActions={mergedHeroActions}
                canTogglePlayback={canTogglePlayback}
                onPlay={() => {
                    if (playNowAction) {
                        playNowAction.onSelect();
                        return;
                    }
                    const contextUri = hero?.item?.uri;
                    if (!contextUri) return;
                    void sendSpotifyMessage('startPlayback', { contextUri });
                }}
            />

            <Flex pl="3" direction="column" gap="3">
                {data?.playlist.description?.trim().length ? (
                    <Flex direction="column" gap="1" pt="2">
                        <Text size="1" color="gray">
                            Description
                        </Text>
                        <Text size="2">{data.playlist.description}</Text>
                    </Flex>
                ) : null}

                <Flex direction="column" gap="2">
                    <Text size="3" weight="bold">
                        Tracks
                    </Text>
                    <MediaShelf
                        items={
                            loading
                                ? Array.from({ length: 10 }, (_, index) => ({
                                      id: `skeleton-${index}`,
                                      title: skeletonLabel,
                                      subtitle: skeletonLabel,
                                  }))
                                : (data?.items ?? [])
                        }
                        variant="list"
                        orientation="vertical"
                        itemsPerColumn={6}
                        draggable={canEdit}
                        interactive={!loading}
                        itemLoading={loading}
                        hasMore={data?.itemsHasMore}
                        loadingMore={data?.itemsLoadingMore}
                        onLoadMore={loadMoreItems}
                        onReorder={handleReorder}
                        getActions={getItemActions}
                    />
                </Flex>
            </Flex>

            <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
                <Dialog.Content size="2" maxWidth="420px">
                    <Dialog.Title>Edit playlist</Dialog.Title>
                    <Dialog.Description size="2" color="gray" mb="3">
                        Update title, description, and visibility settings.
                    </Dialog.Description>
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
                                                          isCollaborative:
                                                              value,
                                                      }
                                                    : prev
                                            )
                                        }
                                    />
                                    <Text size="2">Collaborative</Text>
                                </Flex>
                            </Flex>
                            <Flex justify="end" gap="2">
                                <Dialog.Close>
                                    <Button
                                        size="1"
                                        variant="soft"
                                        disabled={saving}
                                        onClick={resetDetailsDraft}
                                    >
                                        Cancel
                                    </Button>
                                </Dialog.Close>
                                <Button
                                    size="1"
                                    variant="solid"
                                    disabled={saving}
                                    onClick={handleSaveDetails}
                                >
                                    {saving ? 'Saving…' : 'Save changes'}
                                </Button>
                            </Flex>
                        </Flex>
                    )}
                </Dialog.Content>
            </Dialog.Root>
        </Flex>
    );
}
