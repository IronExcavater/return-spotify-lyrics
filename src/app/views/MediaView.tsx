import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { Flex, Text, Tooltip } from '@radix-ui/themes';
import type {
    Album,
    SimplifiedEpisode,
    SimplifiedTrack,
} from '@spotify/web-api-ts-sdk';
import { useLocation } from 'react-router-dom';

import {
    formatDurationLong,
    formatDurationShort,
    formatIsoDate,
} from '../../shared/date';
import { resolveLocale, resolveMarket } from '../../shared/locale';
import {
    albumToItem,
    albumTrackToItem,
    artistToItem,
    formatAlbumType,
    showEpisodeToItem,
    showToItem,
} from '../../shared/media';
import { sendSpotifyMessage } from '../../shared/messaging';
import { MediaItem } from '../../shared/types.ts';
import { DiscographyShelf } from '../components/DiscographyShelf';
import { type HeroData, MediaHero } from '../components/MediaHero';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import { SkeletonText } from '../components/SkeletonText';
import { StickyLayout } from '../components/StickyLayout';
import { TextButton } from '../components/TextButton';
import { updateCachedAssumedNowPlaying } from '../hooks/mediaCacheEntries';
import { useHistory } from '../hooks/useHistory';
import { buildMediaActions } from '../hooks/useMediaActions';
import {
    resolveMediaDataId,
    type MediaDataState,
    useMediaData,
} from '../hooks/useMediaData';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { mediaRouteStore, useRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';

const CONTEXT_KIND_LABEL: Partial<Record<MediaItem['parentKind'], string>> = {
    album: 'album',
    playlist: 'playlist',
    show: 'show',
    audiobook: 'audiobook',
};
type HeroRoutes = {
    goToArtist: (id: string) => void;
    goToShow: (id: string) => void;
};

const buildReleaseInfo = (album: Album, locale: string) => {
    const albumType = formatAlbumType(album);
    const year = formatIsoDate(album.release_date, { year: 'numeric' }, locale);
    const fullDate = formatIsoDate(
        album.release_date,
        { dateStyle: 'long' },
        locale
    );
    if (!albumType && !year) return undefined;
    return (
        <>
            {albumType && <span>{albumType}</span>}
            {albumType && year && <span> • </span>}
            {year &&
                (fullDate ? (
                    <Tooltip content={fullDate}>
                        <span>{year}</span>
                    </Tooltip>
                ) : (
                    <span>{year}</span>
                ))}
        </>
    );
};

const renderArtistNames = (
    artists: Array<{ id?: string | null; name: string }>,
    routes: HeroRoutes
) => (
    <span className="min-w-0">
        {artists.map((artist, index) => {
            const onClick = artist.id
                ? () => routes.goToArtist(artist.id!)
                : undefined;
            return (
                <Fragment key={artist.id ?? artist.name}>
                    <TextButton
                        onClick={onClick}
                        interactive={Boolean(onClick)}
                        size="2"
                        weight="medium"
                        color="gray"
                    >
                        {artist.name}
                    </TextButton>
                    {index < artists.length - 1 && (
                        <Text as="span" size="2" color="gray">
                            {',\u00A0'}
                        </Text>
                    )}
                </Fragment>
            );
        })}
    </span>
);

const buildMediaHeroData = (
    data: MediaDataState | null,
    options: {
        locale: string;
        settingsLocale: string;
        routes: HeroRoutes;
        selectedTrack?: SimplifiedTrack | null;
        selectedEpisode?: SimplifiedEpisode | null;
    }
): HeroData | null => {
    if (!data) return null;
    if (data.kind === 'album') {
        const selectedTrack =
            options.selectedTrack !== undefined
                ? options.selectedTrack
                : data.selectedTrack;
        if (selectedTrack) {
            return {
                title: selectedTrack.name,
                subtitle: renderArtistNames(
                    selectedTrack.artists,
                    options.routes
                ),
                info: buildReleaseInfo(data.album, options.settingsLocale),
                imageUrl: data.album.images?.[0]?.url,
                heroUrl: data.album.images?.[0]?.url,
                duration: formatDurationShort(selectedTrack.duration_ms),
                item: albumTrackToItem(selectedTrack, data.album),
            };
        }
        return {
            title: data.album.name,
            subtitle: renderArtistNames(data.album.artists, options.routes),
            info: buildReleaseInfo(data.album, options.settingsLocale),
            imageUrl: data.album.images?.[0]?.url,
            heroUrl: data.album.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: albumToItem(data.album),
        };
    }
    if (data.kind === 'show') {
        const selectedEpisode =
            options.selectedEpisode !== undefined
                ? options.selectedEpisode
                : data.selectedEpisode;
        if (selectedEpisode) {
            return {
                title: selectedEpisode.name,
                subtitle: data.show.id ? (
                    <TextButton
                        onClick={() => options.routes.goToShow(data.show.id)}
                    >
                        {data.show.name}
                    </TextButton>
                ) : (
                    data.show.name
                ),
                info: data.show.publisher,
                imageUrl: data.show.images?.[0]?.url,
                heroUrl: data.show.images?.[0]?.url,
                duration: formatDurationShort(selectedEpisode.duration_ms),
                item: showEpisodeToItem(
                    selectedEpisode,
                    data.show,
                    options.settingsLocale
                ),
            };
        }
        return {
            title: data.show.name,
            subtitle: `${data.show.total_episodes} episodes`,
            info: data.show.publisher,
            imageUrl: data.show.images?.[0]?.url,
            heroUrl: data.show.images?.[0]?.url,
            duration: formatDurationLong(data.totalDurationMs),
            item: showToItem(data.show),
        };
    }
    if (data.kind === 'artist') {
        const followerTotal = data.artist.followers?.total;
        const genres =
            data.artist.genres?.map((genre) =>
                genre.replace(/\b\w/g, (char) => char.toUpperCase())
            ) ?? [];
        return {
            title: data.artist.name,
            subtitle:
                followerTotal != null
                    ? `${followerTotal.toLocaleString(options.locale)} followers`
                    : undefined,
            info: genres.slice(0, 3).join(' • '),
            imageUrl: data.artist.images?.[0]?.url,
            heroUrl: data.artist.images?.[0]?.url,
            item: artistToItem(data.artist),
        };
    }
    return null;
};

export function MediaView() {
    const location = useLocation();
    const { settings } = useSettings();
    const { goTo } = useHistory();
    const routeHistory = useMemo(() => ({ goTo }), [goTo]);
    const market = resolveMarket(settings.locale);
    const locale = resolveLocale(settings.locale);

    const locationState = location.state as MediaRouteState | null;
    const { state, restoring } = useRouteState<MediaRouteState>({
        locationState,
        store: mediaRouteStore,
        routeHistory,
        routePath: '/media',
    });

    const [discographySort, setDiscographySort] = useState<'newest' | 'oldest'>(
        'newest'
    );
    const discographyTrackCount = 5;
    const { data, loading, loadMoreDiscography, loadMoreEpisodes } =
        useMediaData({
            state,
            market,
            locale: settings.locale,
            goTo,
            discographyTrackCount,
        });

    const isResolvingRoute =
        state?.kind === 'track' || state?.kind === 'episode';
    const dataMatchesState = useMemo(() => {
        if (!data || !state?.id || !state?.kind || isResolvingRoute)
            return false;
        if (data.kind === 'album') {
            return state.kind === 'album' && data.album.id === state.id;
        }
        if (data.kind === 'show') {
            return state.kind === 'show' && data.show.id === state.id;
        }
        if (data.kind === 'artist') {
            return state.kind === 'artist' && data.artist.id === state.id;
        }
        return false;
    }, [data, isResolvingRoute, state?.id, state?.kind]);
    const viewData = dataMatchesState ? data : null;
    const resolvedSelectedId = useMemo(
        () =>
            state?.selectedId
                ? resolveMediaDataId(state.selectedId)
                : undefined,
        [state?.selectedId]
    );
    const selectedTrack = useMemo(() => {
        if (!viewData || viewData.kind !== 'album' || !resolvedSelectedId)
            return null;
        return (
            viewData.trackLookup[resolvedSelectedId] ??
            viewData.trackLookup[state?.selectedId ?? ''] ??
            null
        );
    }, [resolvedSelectedId, state?.selectedId, viewData]);
    const selectedEpisode = useMemo(() => {
        if (!viewData || viewData.kind !== 'show' || !resolvedSelectedId)
            return null;
        return (
            viewData.episodeLookup[resolvedSelectedId] ??
            viewData.episodeLookup[state?.selectedId ?? ''] ??
            null
        );
    }, [resolvedSelectedId, state?.selectedId, viewData]);
    const heroRoutes = useMemo(
        () => ({
            goToArtist: (id: string) => goTo('/media', { kind: 'artist', id }),
            goToShow: (id: string) => goTo('/media', { kind: 'show', id }),
        }),
        [goTo]
    );
    const hero = useMemo<HeroData | null>(
        () =>
            buildMediaHeroData(viewData, {
                locale,
                settingsLocale: settings.locale,
                selectedTrack,
                selectedEpisode,
                routes: heroRoutes,
            }),
        [
            heroRoutes,
            locale,
            selectedEpisode,
            selectedTrack,
            settings.locale,
            viewData,
        ]
    );

    const hasSelection = Boolean(state?.id && state?.kind);
    const isStaleSelection =
        hasSelection && !dataMatchesState && !isResolvingRoute;

    const activeKind =
        viewData?.kind ??
        (state?.kind === 'track'
            ? 'album'
            : state?.kind === 'episode'
              ? 'show'
              : state?.kind);
    const isLoadingView = loading || !viewData || isStaleSelection;
    const albumData = viewData?.kind === 'album' ? viewData : null;
    const showData = viewData?.kind === 'show' ? viewData : null;
    const artistData = viewData?.kind === 'artist' ? viewData : null;
    const shouldShowAlbumSection = isLoadingView
        ? !state?.singleTrack
        : (albumData?.tracks?.length ?? 0) > 1;
    const noopSectionChange = useCallback(() => undefined, []);
    const handleAlbumTitleClick = useMemo(
        () =>
            albumData?.album.id
                ? () =>
                      goTo('/media', {
                          kind: 'album',
                          id: albumData.album.id,
                      })
                : undefined,
        [albumData?.album.id, goTo]
    );

    const albumTracksSection = useMemo(() => {
        if (activeKind !== 'album' || !shouldShowAlbumSection) return null;
        return (
            <MediaSection
                editing={false}
                loading={isLoadingView}
                headerLoading={false}
                onTitleClick={handleAlbumTitleClick}
                section={
                    {
                        id: 'album-tracks',
                        title: albumData?.album.name ?? 'Album',
                        view: 'list',
                        trackSubtitleMode: 'artists',
                        items: albumData?.tracks ?? [],
                    } satisfies MediaSectionState
                }
                onChange={noopSectionChange}
            />
        );
    }, [
        activeKind,
        albumData?.album.id,
        albumData?.album.name,
        albumData?.tracks,
        handleAlbumTitleClick,
        isLoadingView,
        noopSectionChange,
        shouldShowAlbumSection,
    ]);

    const artistUris = useMemo(
        () =>
            artistData
                ? artistData.topTracks
                      .map((track) => track.uri)
                      .filter((uri): uri is string => Boolean(uri))
                : [],
        [artistData]
    );
    const buildPlaybackRequest = useCallback(() => {
        if (!hero?.item) return null;
        if (artistData) {
            return artistUris.length > 0 ? { uris: artistUris } : null;
        }
        if (albumData) {
            const contextUri = albumData.album.uri ?? hero.item.uri;
            if (!contextUri) return null;
            const selectedId = resolvedSelectedId ?? state?.selectedId;
            const selectedIndex =
                selectedId != null
                    ? albumData.tracks.findIndex(
                          (track) => (track.id ?? track.uri) === selectedId
                      )
                    : -1;
            return {
                contextUri,
                offset:
                    selectedIndex >= 0
                        ? { position: selectedIndex }
                        : undefined,
            };
        }
        if (showData) {
            const contextUri = showData?.show.uri ?? hero.item.uri;
            if (!contextUri) return null;
            const selectedId = resolvedSelectedId ?? state?.selectedId;
            const selectedIndex =
                selectedId != null
                    ? (showData?.episodes ?? []).findIndex(
                          (episode) =>
                              (episode.id ?? episode.uri) === selectedId
                      )
                    : -1;
            return {
                contextUri,
                offset:
                    selectedIndex >= 0
                        ? { position: selectedIndex }
                        : undefined,
            };
        }
        return hero.item.uri ? { uris: [hero.item.uri] } : null;
    }, [
        albumData,
        artistData,
        artistUris,
        hero?.item,
        resolvedSelectedId,
        showData,
        state?.selectedId,
    ]);
    const heroActions = useMemo(
        () => (hero ? buildMediaActions(hero.item) : null),
        [hero?.item]
    );
    const artistPlayAction = useMemo(
        () =>
            artistData && artistUris.length > 0
                ? {
                      id: 'play-popular',
                      label: 'Play popular',
                      shortcut: '↵',
                      onSelect: () => {
                          void sendSpotifyMessage('startPlayback', {
                              uris: artistUris,
                          });
                      },
                  }
                : null,
        [artistData, artistUris]
    );
    const playContextAction = useMemo(() => {
        if (!hero?.item) return null;
        if (hero.item.kind !== 'track' && hero.item.kind !== 'episode') {
            return null;
        }
        const request = buildPlaybackRequest();
        if (!request || !('contextUri' in request) || !request.contextUri) {
            return null;
        }
        const contextLabel =
            CONTEXT_KIND_LABEL[hero.item.parentKind] ?? 'context';
        return {
            id: 'play-context',
            label: `Play from ${contextLabel}`,
            onSelect: () => {
                updateCachedAssumedNowPlaying(hero.item);
                void sendSpotifyMessage('startPlayback', request);
            },
        };
    }, [
        buildPlaybackRequest,
        hero?.item,
        hero?.item?.kind,
        hero?.item?.parentKind,
    ]);
    const mergedHeroActions = useMemo(() => {
        if (!heroActions) return null;
        const primary = [...heroActions.primary];
        const secondary = [...heroActions.secondary];
        if (playContextAction) {
            const playNowIndex = primary.findIndex(
                (action) => action.id === 'play-now'
            );
            if (playNowIndex >= 0) {
                primary.splice(playNowIndex + 1, 0, playContextAction);
            } else {
                primary.unshift(playContextAction);
            }
        }
        if (artistPlayAction) primary.unshift(artistPlayAction);
        return { primary, secondary };
    }, [artistPlayAction, heroActions, playContextAction]);
    const playNowAction = useMemo(
        () => heroActions?.primary.find((action) => action.id === 'play-now'),
        [heroActions]
    );
    const canTogglePlayback = useMemo(
        () => (artistData ? artistUris.length > 0 : Boolean(hero?.item?.uri)),
        [artistData, artistUris.length, hero?.item?.uri]
    );

    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    const handlePlay = useCallback(() => {
        if (playNowAction) {
            playNowAction.onSelect();
            return;
        }
        const request = buildPlaybackRequest();
        if (!request) return;
        updateCachedAssumedNowPlaying(hero.item);
        void sendSpotifyMessage('startPlayback', request);
    }, [buildPlaybackRequest, hero?.item, playNowAction]);

    const popularAlbumTracks = useMemo(
        () =>
            albumData
                ? (albumData.artistTopTracks ?? [])
                      .filter(
                          (track) =>
                              track.id !== selectedTrack?.id &&
                              !albumData.trackLookup?.[track.id ?? '']
                      )
                      .slice(0, 12)
                : [],
        [albumData, selectedTrack?.id]
    );
    const albumPopularLoading =
        isLoadingView ||
        (viewData?.kind === 'album' && viewData.popularLoading);
    const albumRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'album' && viewData.recommendedLoading);
    const showRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'show' && viewData.recommendedLoading);
    const artistRecommendedLoading =
        isLoadingView ||
        (viewData?.kind === 'artist' && viewData.recommendedLoading);
    const albumPopularSection = useMemo(
        () =>
            ({
                id: 'album-recommended',
                title: 'Popular',
                view: 'list',
                trackSubtitleMode: 'artist-album',
                items: popularAlbumTracks,
            }) satisfies MediaSectionState,
        [popularAlbumTracks]
    );
    const albumRecommendedSection = useMemo(
        () =>
            ({
                id: 'album-recommended-albums',
                title: 'Recommended',
                view: 'list',
                infinite: 'rows',
                rows: 0,
                trackSubtitleMode: 'artist-album',
                items: albumData?.recommended ?? [],
            }) satisfies MediaSectionState,
        [albumData?.recommended]
    );
    const showEpisodesSection = useMemo(
        () =>
            ({
                id: 'show-episodes',
                title: showData?.show.name ?? 'Show',
                subtitle: ['Show', showData?.releaseYear]
                    .filter(Boolean)
                    .join(' • '),
                view: 'list',
                infinite: 'rows',
                rows: 0,
                items: showData?.episodes ?? [],
                hasMore: isLoadingView ? false : showData?.episodesHasMore,
                loadingMore: isLoadingView
                    ? false
                    : showData?.episodesLoadingMore,
            }) satisfies MediaSectionState,
        [
            isLoadingView,
            showData?.episodes,
            showData?.episodesHasMore,
            showData?.episodesLoadingMore,
            showData?.releaseYear,
            showData?.show.name,
        ]
    );
    const showRecommendedSection = useMemo(
        () =>
            ({
                id: 'show-recommended',
                title: 'Recommended',
                view: 'list',
                infinite: 'rows',
                rows: 0,
                items: showData?.recommended ?? [],
            }) satisfies MediaSectionState,
        [showData?.recommended]
    );
    const artistPopularSection = useMemo(
        () =>
            ({
                id: 'artist-popular',
                title: 'Popular',
                view: 'list',
                trackSubtitleMode: 'artist-album',
                items: artistData?.topTracks ?? [],
            }) satisfies MediaSectionState,
        [artistData?.topTracks]
    );
    const artistRelatedSection = useMemo(
        () =>
            ({
                id: 'artist-fans-also-like',
                title: 'Related artists',
                view: 'card',
                cardSize: 3,
                rows: 1,
                items: artistData?.relatedArtists ?? [],
            }) satisfies MediaSectionState,
        [artistData?.relatedArtists]
    );
    const artistRecommendedSection = useMemo(
        () =>
            ({
                id: 'artist-recommended',
                title: 'Recommended',
                view: 'list',
                infinite: 'rows',
                rows: 0,
                trackSubtitleMode: 'artist-album',
                items: artistData?.recommended ?? [],
            }) satisfies MediaSectionState,
        [artistData?.recommended]
    );
    const handleOpenDiscographyAlbum = useCallback(
        (album: { id?: string | null }) => {
            if (!album.id) return;
            goTo(
                '/media',
                {
                    kind: 'album',
                    id: album.id,
                },
                {
                    samePathBehavior: 'push',
                }
            );
        },
        [goTo]
    );
    const handleOpenDiscographyTrack = useCallback(
        (track: { id?: string | null }) => {
            if (!track.id) return;
            goTo(
                '/media',
                {
                    kind: 'track',
                    id: track.id,
                },
                {
                    samePathBehavior: 'push',
                }
            );
        },
        [goTo]
    );

    const scrollRef = useRef<HTMLDivElement | null>(null);

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
                    Select a media item to view details.
                </Text>
            </Flex>
        );
    }

    if (!loading && !viewData && !isResolvingRoute && !isStaleSelection) {
        return (
            <Flex p="3" direction="column">
                <Text size="2" color="gray">
                    This media type is not supported yet.
                </Text>
            </Flex>
        );
    }

    return (
        <StickyLayout.Root
            className="no-overflow-anchor scrollbar-gutter-stable flex min-h-0 flex-col overflow-y-auto"
            scrollRef={scrollRef}
        >
            <MediaHero
                hero={hero}
                loading={isLoadingView}
                heroUrl={hero?.heroUrl}
                scrollRef={scrollRef}
                collapseKey={viewKey}
                mergedHeroActions={mergedHeroActions}
                canTogglePlayback={canTogglePlayback}
                onPlay={handlePlay}
            />

            <StickyLayout.Body>
                <div className="bg-background absolute -top-2 z-10 h-2 w-full shrink-0" />
                <Flex pl="3" pr="1" direction="column">
                    {activeKind === 'album' && (
                        <>
                            {albumTracksSection}
                            {(albumPopularLoading ||
                                popularAlbumTracks.length > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={albumPopularLoading}
                                    headerLoading={false}
                                    section={albumPopularSection}
                                    onChange={noopSectionChange}
                                />
                            )}
                            {(albumRecommendedLoading ||
                                (albumData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={albumRecommendedLoading}
                                    headerLoading={false}
                                    section={albumRecommendedSection}
                                    onChange={noopSectionChange}
                                />
                            )}
                        </>
                    )}

                    {activeKind === 'show' && (
                        <>
                            <MediaSection
                                editing={false}
                                loading={isLoadingView}
                                headerLoading={false}
                                section={showEpisodesSection}
                                onChange={noopSectionChange}
                                onLoadMore={loadMoreEpisodes}
                            />
                            {(showRecommendedLoading ||
                                (showData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={showRecommendedLoading}
                                    headerLoading={false}
                                    section={showRecommendedSection}
                                    onChange={noopSectionChange}
                                />
                            )}
                        </>
                    )}

                    {activeKind === 'artist' && (
                        <>
                            {(isLoadingView ||
                                (artistData?.topTracks?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={isLoadingView}
                                    headerLoading={false}
                                    section={artistPopularSection}
                                    onChange={noopSectionChange}
                                />
                            )}
                            <MediaSection
                                editing={false}
                                loading={Boolean(
                                    isLoadingView ||
                                        artistData?.relatedArtistsLoading
                                )}
                                headerLoading={false}
                                section={artistRelatedSection}
                                onChange={noopSectionChange}
                            />
                            {(artistRecommendedLoading ||
                                (artistData?.recommended?.length ?? 0) > 0) && (
                                <MediaSection
                                    editing={false}
                                    loading={artistRecommendedLoading}
                                    headerLoading={false}
                                    section={artistRecommendedSection}
                                    onChange={noopSectionChange}
                                />
                            )}
                            {(isLoadingView ||
                                (artistData?.discography?.length ?? 0) > 0) && (
                                <DiscographyShelf
                                    entries={artistData?.discography ?? []}
                                    sort={discographySort}
                                    onSortChange={setDiscographySort}
                                    trackCount={discographyTrackCount}
                                    locale={settings.locale}
                                    loading={isLoadingView}
                                    hasMore={artistData?.discographyHasMore}
                                    loadingMore={
                                        artistData?.discographyLoadingMore
                                    }
                                    onLoadMore={loadMoreDiscography}
                                    onAlbumClick={handleOpenDiscographyAlbum}
                                    onTrackClick={handleOpenDiscographyTrack}
                                />
                            )}
                        </>
                    )}
                </Flex>
            </StickyLayout.Body>
        </StickyLayout.Root>
    );
}
