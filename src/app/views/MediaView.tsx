import { Fragment, useCallback, useState } from 'react';
import { Text, Tooltip } from '@radix-ui/themes';
import type {
    Album,
    SimplifiedEpisode,
    SimplifiedTrack,
} from '@spotify/web-api-ts-sdk';

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
import { DetailViewLayout } from '../components/DetailViewLayout';
import {
    DetailViewLoadingState,
    DetailViewMessage,
} from '../components/DetailViewState';
import { DiscographyShelf } from '../components/DiscographyShelf';
import { type HeroData } from '../components/MediaHero';
import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
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
import { mediaRouteStore, useStoredRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';

const CONTEXT_KIND_LABEL: Partial<Record<MediaItem['parentKind'], string>> = {
    album: 'album',
    playlist: 'playlist',
    show: 'show',
    audiobook: 'audiobook',
};

const noopSectionChange = () => undefined;

type HeroRoutes = {
    goToArtist: (id: string) => void;
    goToShow: (id: string) => void;
};

type AlbumViewData = Extract<MediaDataState, { kind: 'album' }>;
type ShowViewData = Extract<MediaDataState, { kind: 'show' }>;
type ArtistViewData = Extract<MediaDataState, { kind: 'artist' }>;

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
            {albumType && year && <span>{' \u2022 '}</span>}
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
                ? () => routes.goToArtist(artist.id)
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

const matchesState = (
    data: MediaDataState | null,
    state: MediaRouteState | null,
    isResolvingRoute: boolean
) => {
    if (!data || !state?.id || !state.kind || isResolvingRoute) return false;
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
};

const findSelectedTrack = (
    viewData: MediaDataState | null,
    selectedId?: string,
    resolvedSelectedId?: string
) => {
    if (!viewData || viewData.kind !== 'album' || !resolvedSelectedId) {
        return null;
    }

    return (
        viewData.trackLookup[resolvedSelectedId] ??
        viewData.trackLookup[selectedId ?? ''] ??
        null
    );
};

const findSelectedEpisode = (
    viewData: MediaDataState | null,
    selectedId?: string,
    resolvedSelectedId?: string
) => {
    if (!viewData || viewData.kind !== 'show' || !resolvedSelectedId) {
        return null;
    }

    return (
        viewData.episodeLookup[resolvedSelectedId] ??
        viewData.episodeLookup[selectedId ?? ''] ??
        null
    );
};

const getActiveKind = (
    viewData: MediaDataState | null,
    state: MediaRouteState | null
) => {
    if (viewData) return viewData.kind;
    if (state?.kind === 'track') return 'album';
    if (state?.kind === 'episode') return 'show';
    return state?.kind;
};

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
            info: genres.slice(0, 3).join(' \u2022 '),
            imageUrl: data.artist.images?.[0]?.url,
            heroUrl: data.artist.images?.[0]?.url,
            item: artistToItem(data.artist),
        };
    }

    return null;
};

const buildPlaybackRequest = ({
    albumData,
    artistData,
    artistUris,
    heroItem,
    resolvedSelectedId,
    selectedId,
    showData,
}: {
    albumData: AlbumViewData | null;
    artistData: ArtistViewData | null;
    artistUris: string[];
    heroItem?: MediaItem | null;
    resolvedSelectedId?: string;
    selectedId?: string;
    showData: ShowViewData | null;
}) => {
    if (!heroItem) return null;

    if (artistData) {
        return artistUris.length > 0 ? { uris: artistUris } : null;
    }

    if (albumData) {
        const contextUri = albumData.album.uri ?? heroItem.uri;
        if (!contextUri) return null;

        const currentSelectedId = resolvedSelectedId ?? selectedId;
        const selectedIndex =
            currentSelectedId != null
                ? albumData.tracks.findIndex(
                      (track) => (track.id ?? track.uri) === currentSelectedId
                  )
                : -1;

        return {
            contextUri,
            offset:
                selectedIndex >= 0 ? { position: selectedIndex } : undefined,
        };
    }

    if (showData) {
        const contextUri = showData.show.uri ?? heroItem.uri;
        if (!contextUri) return null;

        const currentSelectedId = resolvedSelectedId ?? selectedId;
        const selectedIndex =
            currentSelectedId != null
                ? showData.episodes.findIndex(
                      (episode) =>
                          (episode.id ?? episode.uri) === currentSelectedId
                  )
                : -1;

        return {
            contextUri,
            offset:
                selectedIndex >= 0 ? { position: selectedIndex } : undefined,
        };
    }

    return heroItem.uri ? { uris: [heroItem.uri] } : null;
};

const buildAlbumTracksSection = (
    albumData: AlbumViewData | null
): MediaSectionState => ({
    id: 'album-tracks',
    title: albumData?.album.name ?? 'Album',
    view: 'list',
    trackSubtitleMode: 'artists',
    items: albumData?.tracks ?? [],
});

const buildAlbumPopularSection = (items: MediaItem[]): MediaSectionState => ({
    id: 'album-recommended',
    title: 'Popular',
    view: 'list',
    trackSubtitleMode: 'artist-album',
    items,
});

const buildAlbumRecommendedSection = (
    albumData: AlbumViewData | null
): MediaSectionState => ({
    id: 'album-recommended-albums',
    title: 'Recommended',
    view: 'list',
    infinite: 'rows',
    rows: 0,
    trackSubtitleMode: 'artist-album',
    items: albumData?.recommended ?? [],
});

const buildShowEpisodesSection = (
    showData: ShowViewData | null,
    isLoadingView: boolean
): MediaSectionState => ({
    id: 'show-episodes',
    title: showData?.show.name ?? 'Show',
    subtitle: ['Show', showData?.releaseYear].filter(Boolean).join(' \u2022 '),
    view: 'list',
    infinite: 'rows',
    rows: 0,
    items: showData?.episodes ?? [],
    hasMore: isLoadingView ? false : showData?.episodesHasMore,
    loadingMore: isLoadingView ? false : showData?.episodesLoadingMore,
});

const buildShowRecommendedSection = (
    showData: ShowViewData | null
): MediaSectionState => ({
    id: 'show-recommended',
    title: 'Recommended',
    view: 'list',
    infinite: 'rows',
    rows: 0,
    items: showData?.recommended ?? [],
});

const buildArtistPopularSection = (
    artistData: ArtistViewData | null
): MediaSectionState => ({
    id: 'artist-popular',
    title: 'Popular',
    view: 'list',
    trackSubtitleMode: 'artist-album',
    items: artistData?.topTracks ?? [],
});

const buildArtistRelatedSection = (
    artistData: ArtistViewData | null
): MediaSectionState => ({
    id: 'artist-fans-also-like',
    title: 'Related artists',
    view: 'card',
    cardSize: 3,
    rows: 1,
    items: artistData?.relatedArtists ?? [],
});

const buildArtistRecommendedSection = (
    artistData: ArtistViewData | null
): MediaSectionState => ({
    id: 'artist-recommended',
    title: 'Recommended',
    view: 'list',
    infinite: 'rows',
    rows: 0,
    trackSubtitleMode: 'artist-album',
    items: artistData?.recommended ?? [],
});

type AlbumSectionsProps = {
    albumData: AlbumViewData | null;
    isLoadingView: boolean;
    onTitleClick?: () => void;
    popularAlbumTracks: MediaItem[];
    popularLoading: boolean;
    recommendedLoading: boolean;
    shouldShowAlbumSection: boolean;
};

function AlbumSections({
    albumData,
    isLoadingView,
    onTitleClick,
    popularAlbumTracks,
    popularLoading,
    recommendedLoading,
    shouldShowAlbumSection,
}: AlbumSectionsProps) {
    const showPopular = popularLoading || popularAlbumTracks.length > 0;
    const showRecommended =
        recommendedLoading || (albumData?.recommended.length ?? 0) > 0;

    return (
        <>
            {shouldShowAlbumSection && (
                <MediaSection
                    editing={false}
                    loading={isLoadingView}
                    headerLoading={false}
                    onTitleClick={onTitleClick}
                    section={buildAlbumTracksSection(albumData)}
                    onChange={noopSectionChange}
                />
            )}
            {showPopular && (
                <MediaSection
                    editing={false}
                    loading={popularLoading}
                    headerLoading={false}
                    section={buildAlbumPopularSection(popularAlbumTracks)}
                    onChange={noopSectionChange}
                />
            )}
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildAlbumRecommendedSection(albumData)}
                    onChange={noopSectionChange}
                />
            )}
        </>
    );
}

type ShowSectionsProps = {
    isLoadingView: boolean;
    onLoadMore: () => Promise<void>;
    recommendedLoading: boolean;
    showData: ShowViewData | null;
};

function ShowSections({
    isLoadingView,
    onLoadMore,
    recommendedLoading,
    showData,
}: ShowSectionsProps) {
    const showRecommended =
        recommendedLoading || (showData?.recommended.length ?? 0) > 0;

    return (
        <>
            <MediaSection
                editing={false}
                loading={isLoadingView}
                headerLoading={false}
                section={buildShowEpisodesSection(showData, isLoadingView)}
                onChange={noopSectionChange}
                onLoadMore={onLoadMore}
            />
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildShowRecommendedSection(showData)}
                    onChange={noopSectionChange}
                />
            )}
        </>
    );
}

type ArtistSectionsProps = {
    artistData: ArtistViewData | null;
    discographySort: 'newest' | 'oldest';
    discographyTrackCount: number;
    isLoadingView: boolean;
    locale: string;
    onAlbumClick: (album: { id?: string | null }) => void;
    onLoadMore: () => Promise<void>;
    onSortChange: (sort: 'newest' | 'oldest') => void;
    onTrackClick: (track: { id?: string | null }) => void;
    recommendedLoading: boolean;
};

function ArtistSections({
    artistData,
    discographySort,
    discographyTrackCount,
    isLoadingView,
    locale,
    onAlbumClick,
    onLoadMore,
    onSortChange,
    onTrackClick,
    recommendedLoading,
}: ArtistSectionsProps) {
    const showPopular =
        isLoadingView || (artistData?.topTracks.length ?? 0) > 0;
    const showDiscography =
        isLoadingView || (artistData?.discography.length ?? 0) > 0;
    const showRecommended =
        recommendedLoading || (artistData?.recommended.length ?? 0) > 0;

    return (
        <>
            {showPopular && (
                <MediaSection
                    editing={false}
                    loading={isLoadingView}
                    headerLoading={false}
                    section={buildArtistPopularSection(artistData)}
                    onChange={noopSectionChange}
                />
            )}
            <MediaSection
                editing={false}
                loading={Boolean(
                    isLoadingView || artistData?.relatedArtistsLoading
                )}
                headerLoading={false}
                section={buildArtistRelatedSection(artistData)}
                onChange={noopSectionChange}
            />
            {showRecommended && (
                <MediaSection
                    editing={false}
                    loading={recommendedLoading}
                    headerLoading={false}
                    section={buildArtistRecommendedSection(artistData)}
                    onChange={noopSectionChange}
                />
            )}
            {showDiscography && (
                <DiscographyShelf
                    entries={artistData?.discography ?? []}
                    sort={discographySort}
                    onSortChange={onSortChange}
                    trackCount={discographyTrackCount}
                    locale={locale}
                    loading={isLoadingView}
                    hasMore={artistData?.discographyHasMore}
                    loadingMore={artistData?.discographyLoadingMore}
                    onLoadMore={onLoadMore}
                    onAlbumClick={onAlbumClick}
                    onTrackClick={onTrackClick}
                />
            )}
        </>
    );
}

export function MediaView() {
    const { settings } = useSettings();
    const { goTo } = useHistory();
    const market = resolveMarket(settings.locale);
    const locale = resolveLocale(settings.locale);

    const { state, restoring } = useStoredRouteState<MediaRouteState>({
        store: mediaRouteStore,
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
    const dataMatchesState = matchesState(data, state, isResolvingRoute);
    const viewData = dataMatchesState ? data : null;
    const resolvedSelectedId = state?.selectedId
        ? resolveMediaDataId(state.selectedId)
        : undefined;
    const selectedTrack = findSelectedTrack(
        viewData,
        state?.selectedId,
        resolvedSelectedId
    );
    const selectedEpisode = findSelectedEpisode(
        viewData,
        state?.selectedId,
        resolvedSelectedId
    );
    const hero = buildMediaHeroData(viewData, {
        locale,
        settingsLocale: settings.locale,
        selectedTrack,
        selectedEpisode,
        routes: {
            goToArtist: (id) => goTo('/media', { kind: 'artist', id }),
            goToShow: (id) => goTo('/media', { kind: 'show', id }),
        },
    });

    const hasSelection = Boolean(state?.id && state.kind);
    const isStaleSelection =
        hasSelection && !dataMatchesState && !isResolvingRoute;
    const activeKind = getActiveKind(viewData, state);
    const isLoadingView = loading || !viewData || isStaleSelection;
    const albumData = viewData?.kind === 'album' ? viewData : null;
    const showData = viewData?.kind === 'show' ? viewData : null;
    const artistData = viewData?.kind === 'artist' ? viewData : null;
    const shouldShowAlbumSection = isLoadingView
        ? !state?.singleTrack
        : (albumData?.tracks.length ?? 0) > 1;

    const handleAlbumTitleClick = albumData?.album.id
        ? () =>
              goTo('/media', {
                  kind: 'album',
                  id: albumData.album.id,
              })
        : undefined;

    const artistUris =
        artistData?.topTracks
            .map((track) => track.uri)
            .filter((uri): uri is string => Boolean(uri)) ?? [];
    const playbackRequest = buildPlaybackRequest({
        albumData,
        artistData,
        artistUris,
        heroItem: hero?.item,
        resolvedSelectedId,
        selectedId: state?.selectedId,
        showData,
    });
    const heroActions = hero ? buildMediaActions(hero.item) : null;
    const artistPlayAction =
        artistData && artistUris.length > 0
            ? {
                  id: 'play-popular',
                  label: 'Play popular',
                  shortcut: '\u21b5',
                  onSelect: () => {
                      void sendSpotifyMessage('startPlayback', {
                          uris: artistUris,
                      });
                  },
              }
            : null;
    const playContextAction =
        hero?.item &&
        (hero.item.kind === 'track' || hero.item.kind === 'episode') &&
        playbackRequest &&
        'contextUri' in playbackRequest &&
        playbackRequest.contextUri
            ? {
                  id: 'play-context',
                  label: `Play from ${
                      CONTEXT_KIND_LABEL[hero.item.parentKind] ?? 'context'
                  }`,
                  onSelect: () => {
                      updateCachedAssumedNowPlaying(hero.item);
                      void sendSpotifyMessage('startPlayback', playbackRequest);
                  },
              }
            : null;
    const mergedHeroActions = heroActions
        ? {
              primary: (() => {
                  const primary = [...heroActions.primary];
                  if (playContextAction) {
                      const playNowIndex = primary.findIndex(
                          (action) => action.id === 'play-now'
                      );
                      if (playNowIndex >= 0) {
                          primary.splice(
                              playNowIndex + 1,
                              0,
                              playContextAction
                          );
                      } else {
                          primary.unshift(playContextAction);
                      }
                  }
                  if (artistPlayAction) primary.unshift(artistPlayAction);
                  return primary;
              })(),
              secondary: [...heroActions.secondary],
          }
        : null;
    const playNowAction = heroActions?.primary.find(
        (action) => action.id === 'play-now'
    );
    const canTogglePlayback = artistData
        ? artistUris.length > 0
        : Boolean(hero?.item?.uri);
    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    const handlePlay = useCallback(() => {
        if (playNowAction) {
            playNowAction.onSelect();
            return;
        }
        if (!playbackRequest || !hero?.item) return;

        updateCachedAssumedNowPlaying(hero.item);
        void sendSpotifyMessage('startPlayback', playbackRequest);
    }, [hero?.item, playNowAction, playbackRequest]);

    const popularAlbumTracks =
        albumData?.artistTopTracks
            .filter(
                (track) =>
                    track.id !== selectedTrack?.id &&
                    !albumData.trackLookup[track.id ?? '']
            )
            .slice(0, 12) ?? [];
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

    if (!state) {
        if (restoring) return <DetailViewLoadingState />;

        return (
            <DetailViewMessage message="Select a media item to view details." />
        );
    }

    if (!loading && !viewData && !isResolvingRoute && !isStaleSelection) {
        return (
            <DetailViewMessage message="This media type is not supported yet." />
        );
    }

    return (
        <DetailViewLayout
            hero={hero}
            loading={isLoadingView}
            heroUrl={hero?.heroUrl}
            collapseKey={viewKey}
            mergedHeroActions={mergedHeroActions}
            canTogglePlayback={canTogglePlayback}
            onPlay={handlePlay}
        >
            {activeKind === 'album' && (
                <AlbumSections
                    albumData={albumData}
                    isLoadingView={isLoadingView}
                    onTitleClick={handleAlbumTitleClick}
                    popularAlbumTracks={popularAlbumTracks}
                    popularLoading={albumPopularLoading}
                    recommendedLoading={albumRecommendedLoading}
                    shouldShowAlbumSection={shouldShowAlbumSection}
                />
            )}
            {activeKind === 'show' && (
                <ShowSections
                    isLoadingView={isLoadingView}
                    onLoadMore={loadMoreEpisodes}
                    recommendedLoading={showRecommendedLoading}
                    showData={showData}
                />
            )}
            {activeKind === 'artist' && (
                <ArtistSections
                    artistData={artistData}
                    discographySort={discographySort}
                    discographyTrackCount={discographyTrackCount}
                    isLoadingView={isLoadingView}
                    locale={settings.locale}
                    onAlbumClick={handleOpenDiscographyAlbum}
                    onLoadMore={loadMoreDiscography}
                    onSortChange={setDiscographySort}
                    onTrackClick={handleOpenDiscographyTrack}
                    recommendedLoading={artistRecommendedLoading}
                />
            )}
        </DetailViewLayout>
    );
}
