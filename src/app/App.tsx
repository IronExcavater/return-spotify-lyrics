import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ANALYTICS_EVENTS, createAnalyticsTracker } from '../shared/analytics';
import { AppShell } from './appShell/AppShell';
import { useAppRoutes } from './appShell/routes';
import {
    toHomeRouteState,
    useHomeSearchRouteSync,
    useLastContentPath,
} from './appShell/searchRouteState';
import { useAppBarPortals } from './appShell/useAppBarPortals';
import { primeTrackPlaylistCatalogCache } from './data/playlistStore';
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

    const { authed, profile, login, logout, connection } = useAuth();
    const {
        hasPlayback,
        playbackKnown,
        isPlaying,
        canTogglePlay,
        canSetVolume,
    } = usePlayerShortcutState();
    const controls = usePlayerShortcutControls();
    const { needsReauth, missingScopes } = useReauthGate();
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
    const mustReauth = authed === true && needsReauth;

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
        if (search.query.trim()) {
            void trackSearch(ANALYTICS_EVENTS.searchClear, {
                reason: 'search query cleared',
            });
        }

        search.setQuery('');
    }, [search.query, search.setQuery, trackSearch]);

    const handleSearchSubmit = useCallback(() => {
        void trackSearch(ANALYTICS_EVENTS.searchSubmit, {
            reason: 'search submitted',
            data: {
                query: search.query.trim(),
                filters: search.filters.map((filter) => filter.kind),
            },
        });

        routeHistory.goTo(
            '/home',
            toHomeRouteState(search.query, search.filters)
        );
    }, [routeHistory.goTo, search.filters, search.query, trackSearch]);

    const handleGoBack = useCallback(() => {
        const previous = routeHistory.goBack();
        if (previous?.path !== '/home') return;

        const homeState = toHomeRouteState(
            previous.state && 'searchQuery' in previous.state
                ? (previous.state.searchQuery ?? '')
                : '',
            previous.state && 'searchFilters' in previous.state
                ? (previous.state.searchFilters ?? [])
                : []
        );
        if (!homeState) return;

        search.setSearchState({
            query: homeState.searchQuery ?? '',
            filters: homeState.searchFilters ?? [],
        });
    }, [routeHistory.goBack, search.setSearchState]);

    const appRoutes = useAppRoutes({
        mustLogin,
        mustLogout,
        login,
        logout,
        profile,
        connection,
        searchQuery: search.debouncedQuery,
        searchFilters: search.debouncedFilters,
    });

    const appContent = (
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
                query: search.query,
                filters: search.filters,
                availableFilters: search.available,
                onChange: search.setQuery,
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
            reauth={{
                open: mustReauth,
                missingScopes,
                onReconnect: handleReauth,
            }}
            portals={appBarPortals.portals}
        />
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
