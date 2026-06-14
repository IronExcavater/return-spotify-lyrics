import { useCallback, useState } from 'react';

import { resolveLocale, resolveMarket } from '../../shared/locale';
import { resolveSpotifyMediaId } from '../../shared/media';
import { DetailViewLayout } from '../components/DetailViewLayout';
import {
    DetailViewLoadingState,
    DetailViewMessage,
} from '../components/DetailViewState';
import { usePremiumPlaybackBlocked } from '../data/playbackAccess';
import { buildMediaHeroData } from '../features/media/view/heroData';
import {
    AlbumSections,
    ArtistSections,
    ShowSections,
} from '../features/media/view/MediaViewSections';
import {
    findSelectedEpisode,
    findSelectedTrack,
    getActiveMediaKind,
    matchesMediaState,
} from '../features/media/view/viewState';
import { useAuth } from '../hooks/useAuth';
import { useHistory } from '../hooks/useHistory';
import { useMediaData } from '../hooks/useMediaData';
import type { MediaRouteState } from '../hooks/useMediaRoute';
import { mediaRouteStore, useStoredRouteState } from '../hooks/useRouteState';
import { useSettings } from '../hooks/useSettings';
import { buildMediaHeroActions, playMediaHero } from './media/heroActions';

export function MediaView() {
    const { settings } = useSettings();
    const { profile } = useAuth();
    const premiumRequired = usePremiumPlaybackBlocked();
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
            locale,
            goTo,
            discographyTrackCount,
        });

    const isResolvingRoute =
        state?.kind === 'track' || state?.kind === 'episode';
    const dataMatchesState = matchesMediaState(data, state, isResolvingRoute);
    const viewData = dataMatchesState ? data : null;
    const resolvedSelectedId = state?.selectedId
        ? resolveSpotifyMediaId(state.selectedId)
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
        settingsLocale: locale,
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
    const activeKind = getActiveMediaKind(viewData, state);
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
    const {
        canTogglePlayback,
        mergedHeroActions,
        playbackRequest,
        playNowAction,
    } = buildMediaHeroActions({
        albumData,
        artistData,
        artistUris,
        heroItem: hero?.item,
        premiumRequired,
        profileId: profile?.id,
        resolvedSelectedId,
        selectedId: state?.selectedId,
        showData,
    });
    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    const handlePlay = useCallback(() => {
        playMediaHero({
            heroItem: hero?.item,
            playbackRequest,
            playNowAction,
            premiumRequired,
        });
    }, [hero?.item, playNowAction, playbackRequest, premiumRequired]);

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
                    locale={locale}
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
