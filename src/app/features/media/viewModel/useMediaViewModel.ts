import { useCallback, useState } from 'react';

import { resolveLocale, resolveMarket } from '../../../../shared/locale';
import { resolveSpotifyMediaId } from '../../../../shared/media';
import { usePremiumPlaybackBlocked } from '../../../data/playbackAccess';
import { useAuth } from '../../../hooks/useAuth';
import { useHistory } from '../../../hooks/useHistory';
import type { MediaRouteState } from '../../../hooks/useMediaRoute';
import {
    mediaRouteStore,
    useStoredRouteState,
} from '../../../hooks/useRouteState';
import { useSettings } from '../../../hooks/useSettings';
import { buildMediaHeroData } from '../view/heroData';
import type {
    AlbumSectionsProps,
    ArtistSectionsProps,
    ShowSectionsProps,
} from '../view/MediaViewSections';
import {
    findSelectedEpisode,
    findSelectedTrack,
    getActiveMediaKind,
    matchesMediaState,
} from '../view/viewState';
import { buildMediaHeroActions, playMediaHero } from './heroActions';
import { useMediaData } from './useMediaData';

type DiscographySort = ArtistSectionsProps['discographySort'];

export function useMediaViewModel() {
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

    const [discographySort, setDiscographySort] =
        useState<DiscographySort>('newest');
    const [discographyShowAppearances, setDiscographyShowAppearances] =
        useState(false);
    const discographyTrackCount = 5;
    const { data, loading, loadMoreDiscography, loadMoreEpisodes } =
        useMediaData({
            state,
            market,
            locale,
            goTo,
            discographyTrackCount,
            discographyIncludeAppearances: discographyShowAppearances,
        });

    const isResolvingRoute =
        state?.kind === 'track' || state?.kind === 'episode';
    const dataMatchesState = matchesMediaState(data, state, isResolvingRoute);
    const viewData = dataMatchesState ? data : null;
    const activeKind = getActiveMediaKind(viewData, state);
    const selectedTrack = findSelectedTrack(viewData, state?.selectedId);
    const selectedEpisode = findSelectedEpisode(viewData, state?.selectedId);
    const resolvedSelectedId = state?.selectedId
        ? resolveSpotifyMediaId(state.selectedId)
        : undefined;
    const goToArtist = useCallback(
        (id: string) => goTo('/media', { kind: 'artist', id }),
        [goTo]
    );
    const goToShow = useCallback(
        (id: string) => goTo('/media', { kind: 'show', id }),
        [goTo]
    );

    const hero = buildMediaHeroData(viewData, {
        locale,
        settingsLocale: locale,
        selectedTrack,
        selectedEpisode,
        routes: { goToArtist, goToShow },
    });

    const hasSelection = Boolean(state?.id && state.kind);
    const isStaleSelection =
        hasSelection && !dataMatchesState && !isResolvingRoute;
    const isLoadingView = loading || !viewData || isStaleSelection;
    const albumData = viewData?.kind === 'album' ? viewData : null;
    const showData = viewData?.kind === 'show' ? viewData : null;
    const artistData = viewData?.kind === 'artist' ? viewData : null;
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

    const handlePlay = useCallback(() => {
        playMediaHero({
            heroItem: hero?.item,
            playbackRequest,
            playNowAction,
            premiumRequired,
        });
    }, [hero?.item, playNowAction, playbackRequest, premiumRequired]);

    const handleAlbumTitleClick = useCallback(() => {
        if (!albumData?.album.id) return;
        goTo('/media', {
            kind: 'album',
            id: albumData.album.id,
        });
    }, [albumData?.album.id, goTo]);

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

    const popularAlbumTracks =
        albumData?.artistTopTracks
            .filter(
                (track) =>
                    track.id !== selectedTrack?.id &&
                    !albumData.trackLookup[track.id ?? '']
            )
            .slice(0, 12) ?? [];
    const viewKey = `${state?.kind ?? 'none'}:${state?.id ?? 'none'}`;

    return {
        activeKind,
        restoring,
        message: resolveMediaMessage({
            isResolvingRoute,
            isStaleSelection,
            loading,
            restoring,
            state,
            viewData,
        }),
        layout: {
            canTogglePlayback,
            collapseKey: viewKey,
            hero,
            heroUrl: hero?.heroUrl,
            loading: isLoadingView,
            mergedHeroActions,
            onPlay: handlePlay,
        },
        albumSections: {
            albumData,
            isLoadingView,
            onTitleClick: albumData?.album.id
                ? handleAlbumTitleClick
                : undefined,
            popularAlbumTracks,
            popularLoading:
                isLoadingView ||
                (viewData?.kind === 'album' && viewData.popularLoading),
            recommendedLoading:
                isLoadingView ||
                (viewData?.kind === 'album' && viewData.recommendedLoading),
            shouldShowAlbumSection: isLoadingView
                ? !state?.singleTrack
                : (albumData?.tracks.length ?? 0) > 1,
        } satisfies AlbumSectionsProps,
        showSections: {
            isLoadingView,
            onLoadMore: loadMoreEpisodes,
            recommendedLoading:
                isLoadingView ||
                (viewData?.kind === 'show' && viewData.recommendedLoading),
            showData,
        } satisfies ShowSectionsProps,
        artistSections: {
            artistData,
            discographySort,
            discographyShowAppearances,
            discographyTrackCount,
            isLoadingView,
            locale,
            onAlbumClick: handleOpenDiscographyAlbum,
            onLoadMore: loadMoreDiscography,
            onShowAppearancesChange: setDiscographyShowAppearances,
            onSortChange: setDiscographySort,
            onTrackClick: handleOpenDiscographyTrack,
            recommendedLoading:
                isLoadingView ||
                (viewData?.kind === 'artist' && viewData.recommendedLoading),
        } satisfies ArtistSectionsProps,
    };
}

function resolveMediaMessage({
    isResolvingRoute,
    isStaleSelection,
    loading,
    restoring,
    state,
    viewData,
}: {
    isResolvingRoute: boolean;
    isStaleSelection: boolean;
    loading: boolean;
    restoring: boolean;
    state: MediaRouteState | null;
    viewData: unknown;
}) {
    if (!state && !restoring) return 'Select a media item to view details.';

    if (!loading && !viewData && !isResolvingRoute && !isStaleSelection) {
        return 'This media type is not supported yet.';
    }

    return null;
}
