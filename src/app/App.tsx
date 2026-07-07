import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ANALYTICS_EVENTS, createAnalyticsTracker } from '../shared/analytics';
import { AppShell } from './appShell/AppShell';
import { useAppRoutes } from './appShell/routes';
import {
    fromHomeRouteState,
    isHomeRouteState,
    toHomeRouteState,
    useHomeSearchRouteSync,
    useLastContentPath,
} from './appShell/searchRouteState';
import { useAppBarPortals } from './appShell/useAppBarPortals';
import { ReauthDialog } from './components/ReauthDialog';
import { getSpotifyAuthNotices } from './features/auth/spotifyAuthNotices';
import { primeTrackPlaylistCatalogCache } from './features/playlists/store';
import {
    MEDIA_CACHE_KEYS,
    type ProfileCacheEntry,
} from './hooks/mediaCacheEntries';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { useHistory, type RouteState } from './hooks/useHistory';
import { useMediaCacheEntry } from './hooks/useMediaCache';
import type { MediaRouteState } from './hooks/useMediaRoute';
import {
    usePlayerShortcutControls,
    usePlayerShortcutState,
} from './hooks/usePlayer.ts';
import { useReauthGate } from './hooks/useReauthGate.ts';
import { Resizer } from './hooks/useResize.tsx';
import { useSearch } from './hooks/useSearch';
import { getSurfaceConfig, type Surface } from './surface';

const WIDTH_BOUNDS = { min: 350, max: 500 } as const;
const HEIGHT_BOUNDS = { min: 300, max: 600 } as const;

type AppProps = {
    surface?: Surface;
};

export default function App({ surface = 'popup' }: AppProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const surfaceConfig = getSurfaceConfig(surface);

    const { authed, profile, login, logout, connection, authStatus } =
        useAuth();
    const {
        hasPlayback,
        playbackKnown,
        isPlaying,
        canTogglePlay,
        canSetVolume,
    } = usePlayerShortcutState();
    const controls = usePlayerShortcutControls();
    const { missingScopes } = useReauthGate();
    const appState = useAppState({
        fallbackWidth: WIDTH_BOUNDS.min,
        fallbackHeight: HEIGHT_BOUNDS.min,
        surface,
        showBars: authed !== false,
        hasPlayback,
        playbackKnown,
    });
    const routeHistory = useHistory();
    const cachedProfile = useMediaCacheEntry<ProfileCacheEntry>(
        MEDIA_CACHE_KEYS.profile
    );
    const search = useSearch();
    const trackSearch = useMemo(() => createAnalyticsTracker('search'), []);
    const authNotices = useMemo(
        () => getSpotifyAuthNotices({ authStatus, missingScopes }),
        [authStatus, missingScopes]
    );
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const canShowPlaybackBar = hasPlayback || !playbackKnown;
    const profileImage = profile?.images?.[0]?.url ?? cachedProfile?.imageUrl;
    const locationState = (location.state as RouteState | null) ?? null;
    const lastHomeStateRef = useHomeSearchRouteSync({
        pathname: location.pathname,
        locationState,
        search,
        rememberState: routeHistory.rememberState,
    });
    const lastContentPathRef = useLastContentPath(location.pathname);

    useEffect(() => {
        if (authed !== true) return;
        void primeTrackPlaylistCatalogCache(connection?.userId ?? profile?.id);
    }, [authed, connection?.userId, profile?.id]);

    // Auth semantics
    const mustLogin = authed === false && authed !== undefined;
    const mustLogout = authed === true;
    const mustReauth = authed === true && authNotices.length > 0;

    const handleReauth = useCallback(() => {
        logout();
        window.setTimeout(() => login(), 150);
    }, [login, logout]);

    useAppShortcuts({
        showBars: appState.showBars,
        activeBar: appState.activeBar,
        setActiveBar: appState.setActiveBar,
        searchInputRef,
        isPlaying,
        canTogglePlay,
        canSetVolume,
        playbackControls: {
            play: controls.play,
            pause: controls.pause,
            toggleMute: controls.toggleMute,
        },
    });

    const appBarPortals = useAppBarPortals({
        activeBar: appState.activeBar,
        setActiveBar: appState.setActiveBar,
        showBars: appState.showBars,
        canShowPlaybackBar,
        pathname: location.pathname,
        navigate,
        goBack: routeHistory.goBack,
        profileImage,
        lastContentPath: lastContentPathRef.current,
        lastHomeState: lastHomeStateRef.current,
    });

    const handleOpenMediaFromPlayback = useCallback(
        (route: MediaRouteState) => {
            appState.setActiveBar('home');
            requestAnimationFrame(() => {
                routeHistory.goTo('/media', route, {
                    samePathBehavior: 'replace',
                });
            });
        },
        [appState.setActiveBar, routeHistory.goTo]
    );

    const handleSearchClear = useCallback(() => {
        if (search.state.query.trim()) {
            void trackSearch(ANALYTICS_EVENTS.searchClear, {
                reason: 'search query cleared',
            });
        }

        search.setQueryText('');
    }, [search.setQueryText, search.state.query, trackSearch]);

    const handleSearchSubmit = useCallback(() => {
        void trackSearch(ANALYTICS_EVENTS.searchSubmit, {
            reason: 'search submitted',
            data: {
                query: search.state.query.trim(),
                filters: search.state.filters.map((filter) => filter.kind),
            },
        });

        routeHistory.goTo('/home', toHomeRouteState(search.state));
    }, [routeHistory.goTo, search.state, trackSearch]);

    const handleGoBack = useCallback(() => {
        const previous = routeHistory.goBack();
        if (previous?.path !== '/home') return;

        search.replaceState(
            fromHomeRouteState(
                isHomeRouteState(previous.state) ? previous.state : undefined
            )
        );
    }, [routeHistory.goBack, search.replaceState]);

    const appRoutes = useAppRoutes({
        mustLogin,
        mustLogout,
        login,
        logout,
        profile,
        connection,
        authNotices,
        searchState: search.debouncedState,
    });

    const appContent = (
        <>
            <AppShell
                showBars={appState.showBars}
                activeBar={appState.activeBar}
                appRoutes={appRoutes}
                profileSlot={{
                    home: appBarPortals.profileAnchors.home,
                    playback: appBarPortals.profileAnchors.playback,
                }}
                navSlot={{
                    home: appBarPortals.navAnchors.home,
                    playback: appBarPortals.navAnchors.playback,
                }}
                search={{
                    query: search.state.query,
                    filters: search.state.filters,
                    availableFilters: search.available,
                    onChange: search.setQueryText,
                    onClear: handleSearchClear,
                    onSubmit: handleSearchSubmit,
                    onAddFilter: search.addFilter,
                    onUpdateFilter: search.updateFilter,
                    onRemoveFilter: search.removeFilter,
                    onClearFilters: search.clearFilters,
                    inputRef: searchInputRef,
                }}
                history={{
                    canGoBack: routeHistory.canGoBack,
                    onGoBack: handleGoBack,
                }}
                playback={{
                    expanded: appState.playbackExpanded,
                    onExpandedChange: appState.setPlaybackExpanded,
                    onOpenMediaRoute: handleOpenMediaFromPlayback,
                }}
                portals={appBarPortals.portals}
            />
            <ReauthDialog
                open={mustReauth}
                notices={authNotices}
                onReconnect={handleReauth}
            />
        </>
    );

    if (!surfaceConfig.resizer) {
        return appContent;
    }

    return (
        <Resizer
            width={{
                value: appState.layout.width,
                min: WIDTH_BOUNDS.min,
                max: WIDTH_BOUNDS.max,
                override: appState.layout.widthOverride,
            }}
            height={{
                value: appState.layout.height,
                min: HEIGHT_BOUNDS.min,
                max: HEIGHT_BOUNDS.max,
                override: appState.layout.heightOverride,
            }}
            onWidthChange={appState.setWidth}
            onHeightChange={appState.setHeight}
        >
            {appContent}
        </Resizer>
    );
}
