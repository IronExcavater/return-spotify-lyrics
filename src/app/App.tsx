import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { PersonIcon } from '@radix-ui/react-icons';
import { Flex } from '@radix-ui/themes';
import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { ANALYTICS_EVENTS, createAnalyticsTracker } from '../shared/analytics';
import { AvatarButton } from './components/AvatarButton';
import { HomeBar } from './components/HomeBar';
import { NavBar } from './components/NavBar';
import { PlaybackBar } from './components/PlaybackBar';
import { ProtectedLayout } from './components/ProtectedLayout';
import { ReauthDialog } from './components/ReauthDialog';
import { ToastViewport } from './components/ToastViewport';
import { SettingsProvider } from './context/SettingsContext';
import { primeTrackPlaylistCatalogCache } from './data/playlistStore';
import {
    MEDIA_CACHE_KEYS,
    type ProfileCacheEntry,
} from './hooks/mediaCacheEntries';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useAppState, BarKey } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import {
    useHistory,
    type HomeRouteState,
    type RouteState,
} from './hooks/useHistory';

import { useMediaCacheEntry } from './hooks/useMediaCache';
import type { MediaRouteState } from './hooks/useMediaRoute';
import {
    usePlayerShortcutControls,
    usePlayerShortcutState,
} from './hooks/usePlayer.ts';
import { usePortalSlot } from './hooks/usePortalSlot';
import { useReauthGate } from './hooks/useReauthGate.ts';
import { Resizer } from './hooks/useResize.tsx';
import { useSearch } from './hooks/useSearch';
import { getSurfaceConfig, type Surface } from './surface';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { LyricsView } from './views/LyricsView';
import { MediaView } from './views/MediaView';
import { PlaylistView } from './views/PlaylistView';
import { ProfileView } from './views/ProfileView';
import { QueueView } from './views/QueueView';

const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];
const WIDTH_BOUNDS = { min: 350, max: 500 } as const;
const HEIGHT_BOUNDS = { min: 300, max: 600 } as const;

const isHomeRouteState = (
    state: RouteState | null | undefined
): state is HomeRouteState =>
    !!state && ('searchQuery' in state || 'searchFilters' in state);

const toHomeRouteState = (
    query: string,
    filters: HomeRouteState['searchFilters'] = []
): HomeRouteState | undefined => {
    const nextFilters = filters && filters.length > 0 ? filters : undefined;
    if (!query.trim() && !nextFilters) return undefined;

    return {
        searchQuery: query,
        searchFilters: nextFilters,
    };
};

type SearchStateSync = ReturnType<typeof useSearch>;

function useHomeSearchRouteState(
    pathname: string,
    locationState: RouteState | null,
    search: SearchStateSync,
    rememberState: (state?: RouteState) => void
) {
    const lastHomeStateRef = useRef<HomeRouteState | null>(null);
    const currentHomeState = useMemo(
        () => toHomeRouteState(search.query, search.filters) ?? null,
        [search.filters, search.query]
    );
    const debouncedHomeState = useMemo(
        () =>
            toHomeRouteState(
                search.debouncedQuery,
                search.debouncedFilters
            ) ?? null,
        [search.debouncedFilters, search.debouncedQuery]
    );

    useEffect(() => {
        if (pathname !== '/home') return;
        if (!isHomeRouteState(locationState)) return;

        search.setSearchState({
            query: locationState.searchQuery ?? '',
            filters: locationState.searchFilters ?? [],
        });
    }, [locationState, pathname, search.setSearchState]);

    useEffect(() => {
        if (pathname !== '/home') return;

        lastHomeStateRef.current = currentHomeState;
    }, [currentHomeState, pathname]);

    useEffect(() => {
        if (pathname !== '/home') return;

        rememberState(debouncedHomeState ?? undefined);
    }, [debouncedHomeState, pathname, rememberState]);

    return lastHomeStateRef;
}

function useLastContentPath(pathname: string) {
    const lastContentPathRef = useRef('/home');

    useEffect(() => {
        if (pathname === '/profile') return;

        lastContentPathRef.current = pathname;
    }, [pathname]);

    return lastContentPathRef;
}

function useResizeObserverNudge(activeBar: BarKey, pathname: string) {
    useEffect(() => {
        const body = document.body;
        const previousPadding = body.style.paddingRight;
        body.style.paddingRight = '0.5px';

        const raf = requestAnimationFrame(() => {
            body.style.paddingRight = previousPadding;
            window.dispatchEvent(new Event('resize'));
        });

        return () => {
            cancelAnimationFrame(raf);
            body.style.paddingRight = previousPadding;
        };
    }, [activeBar, pathname]);
}

type GuardedRoute = {
    path: string;
    element: ReactNode;
    when: boolean;
    redirectTo: string;
};

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
    const lastHomeStateRef = useHomeSearchRouteState(
        location.pathname,
        location.state as RouteState | null,
        search,
        routeHistory.rememberState
    );

    useEffect(() => {
        if (authed !== true) return;
        void primeTrackPlaylistCatalogCache(connection?.userId ?? profile?.id);
    }, [authed, connection?.userId, profile?.id]);

    // Auth semantics
    const mustLogin = authed === false && authed !== undefined;
    const mustLogout = authed === true;
    const mustReauth = authed === true && needsReauth;

    const handleReauth = () => {
        logout();
        window.setTimeout(() => login(), 150);
    };
    const lastContentPathRef = useLastContentPath(location.pathname);

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

    const profileSlot = useMemo(
        () => (
            <AvatarButton
                avatar={{
                    fallback: <PersonIcon />,
                    radius: 'full',
                    size: '3',
                    src: profileImage,
                }}
                variant="ghost"
                size="2"
                onClick={() => {
                    if (location.pathname === '/profile') {
                        const previous = routeHistory.goBack();
                        if (previous) return;
                        navigate(lastContentPathRef.current || '/home', {
                            replace: true,
                            state:
                                lastContentPathRef.current === '/home'
                                    ? (lastHomeStateRef.current ?? undefined)
                                    : undefined,
                        });
                        return;
                    }
                    navigate('/profile');
                }}
                aria-pressed={location.pathname === '/profile'}
                aria-selected={location.pathname === '/profile'}
                aria-current={
                    location.pathname === '/profile' ? 'page' : undefined
                }
            />
        ),
        [profileImage, location.pathname, navigate]
    );

    const navSlot = useMemo(
        () => (
            <NavBar
                active={appState.activeBar}
                canShowPlayback={canShowPlaybackBar}
                onShowHome={() => appState.setActiveBar('home')}
                onShowPlayback={() => appState.setActiveBar('playback')}
            />
        ),
        [appState.activeBar, appState.setActiveBar, canShowPlaybackBar]
    );

    const profileFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: profileSlot,
        activeKey: appState.activeBar,
        defaultKey: 'home',
        enabled: appState.showBars,
    });

    const navFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: navSlot,
        activeKey: appState.activeBar,
        defaultKey: 'home',
        enabled: appState.showBars,
    });

    useResizeObserverNudge(appState.activeBar, location.pathname);

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

        const homeState = isHomeRouteState(previous.state)
            ? previous.state
            : undefined;
        search.setSearchState({
            query: homeState?.searchQuery ?? '',
            filters: homeState?.searchFilters ?? [],
        });
    }, [routeHistory.goBack, search.setSearchState]);

    const appRoutes = useMemo<GuardedRoute[]>(
        () => [
            {
                path: '/',
                element: <></>,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/home',
                element: (
                    <HomeView
                        searchQuery={search.debouncedQuery}
                        filters={search.debouncedFilters}
                    />
                ),
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/lyrics',
                element: <LyricsView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/profile',
                element: (
                    <ProfileView
                        profile={profile}
                        connection={connection}
                        onLogout={logout}
                    />
                ),
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/queue',
                element: <QueueView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/media',
                element: <MediaView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/playlist',
                element: <PlaylistView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/login',
                element: <LoginView onLogin={login} />,
                when: mustLogout,
                redirectTo: '/home',
            },
        ],
        [
            connection,
            login,
            logout,
            mustLogin,
            mustLogout,
            profile,
            search.debouncedFilters,
            search.debouncedQuery,
        ]
    );

    const appContent = (
        <SettingsProvider>
            <Flex direction="column" className="h-full">
                {/* Top bar */}
                {appState.showBars && (
                    <Flex className="relative z-30 shrink-0 border-b-2 border-grayA-6 bg-panel-solid">
                        {appState.activeBar === 'playback' && (
                            <PlaybackBar
                                profileSlot={profileFloating.anchors.playback}
                                navSlot={navFloating.anchors.playback}
                                expanded={appState.playbackExpanded}
                                onExpandedChange={appState.setPlaybackExpanded}
                                onOpenMediaRoute={handleOpenMediaFromPlayback}
                            />
                        )}

                        {appState.activeBar === 'home' && (
                            <HomeBar
                                profileSlot={profileFloating.anchors.home}
                                navSlot={navFloating.anchors.home}
                                searchQuery={search.query}
                                onSearchChange={search.setQuery}
                                onClearSearch={handleSearchClear}
                                onSearchSubmit={handleSearchSubmit}
                                canGoBack={routeHistory.canGoBack}
                                onGoBack={handleGoBack}
                                filters={search.filters}
                                availableFilters={search.available}
                                onAddFilter={search.addFilter}
                                onUpdateFilter={search.updateFilter}
                                onRemoveFilter={search.removeFilter}
                                onClearFilters={search.clearFilters}
                                searchInputRef={searchInputRef}
                            />
                        )}
                    </Flex>
                )}

                {/* Routes */}
                <Routes>
                    {appRoutes.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <ProtectedLayout
                                    when={route.when}
                                    redirectTo={route.redirectTo}
                                >
                                    {route.element}
                                </ProtectedLayout>
                            }
                        />
                    ))}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <ReauthDialog
                    open={mustReauth}
                    reasons={needsReauth ? ['missing-scopes'] : []}
                    missingScopes={missingScopes}
                    onReconnect={handleReauth}
                />

                <ToastViewport />
                {profileFloating.portal}
                {navFloating.portal}
            </Flex>
        </SettingsProvider>
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
