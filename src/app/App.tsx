import { useCallback, useEffect, useMemo, useRef } from 'react';
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

const isHomeRouteState = (
    state: RouteState | null | undefined
): state is HomeRouteState =>
    !!state && ('searchQuery' in state || 'searchFilters' in state);

type AppProps = {
    surface?: Surface;
};

export default function App({ surface = 'popup' }: AppProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const surfaceConfig = getSurfaceConfig(surface);

    const widthBounds = { min: 350, max: 500 } as const;
    const heightBounds = { min: 300, max: 600 } as const;

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
        fallbackWidth: widthBounds.min,
        fallbackHeight: heightBounds.min,
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

    const lastHomeStateRef = useRef<HomeRouteState | null>(null);

    useEffect(() => {
        if (location.pathname !== '/home') return;
        const state = location.state as RouteState | null;
        if (!isHomeRouteState(state)) return;
        search.setSearchState({
            query: state.searchQuery ?? '',
            filters: state.searchFilters ?? [],
        });
    }, [location.pathname, location.state, search.setSearchState]);

    useEffect(() => {
        if (location.pathname !== '/home') return;
        lastHomeStateRef.current = {
            searchQuery: search.query,
            searchFilters:
                search.filters && search.filters.length > 0
                    ? search.filters
                    : undefined,
        };
    }, [location.pathname, search.filters, search.query]);

    useEffect(() => {
        if (location.pathname !== '/home') return;
        routeHistory.rememberState({
            searchQuery: search.debouncedQuery,
            searchFilters:
                search.debouncedFilters && search.debouncedFilters.length > 0
                    ? search.debouncedFilters
                    : undefined,
        });
    }, [
        location.pathname,
        routeHistory.rememberState,
        search.debouncedFilters,
        search.debouncedQuery,
    ]);

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

    // Slots
    const lastContentPathRef = useRef('/home');

    useEffect(() => {
        if (location.pathname !== '/profile')
            lastContentPathRef.current = location.pathname;
    }, [location.pathname]);

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

    // Force a lightweight layout change on app state updates so ResizeObservers rerun.
    useEffect(() => {
        const body = document.body;
        const prevPadding = body.style.paddingRight;
        body.style.paddingRight = '0.5px';

        const raf = requestAnimationFrame(() => {
            body.style.paddingRight = prevPadding;
            window.dispatchEvent(new Event('resize'));
        });

        return () => {
            cancelAnimationFrame(raf);
            body.style.paddingRight = prevPadding;
        };
    }, [appState.activeBar, location.pathname]);

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

    const appContent = (
        <SettingsProvider>
            <Flex direction="column" className="h-full">
                {/* Top bar */}
                {appState.showBars && (
                    <Flex className="border-grayA-6 bg-panel-solid relative z-30 shrink-0 border-b-2">
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
                                onClearSearch={() => {
                                    if (search.query.trim()) {
                                        void trackSearch(
                                            ANALYTICS_EVENTS.searchClear,
                                            {
                                                reason: 'search query cleared',
                                            }
                                        );
                                    }
                                    search.setQuery('');
                                }}
                                onSearchSubmit={() => {
                                    void trackSearch(
                                        ANALYTICS_EVENTS.searchSubmit,
                                        {
                                            reason: 'search submitted',
                                            data: {
                                                query: search.query.trim(),
                                                filters: search.filters.map(
                                                    (filter) => filter.kind
                                                ),
                                            },
                                        }
                                    );
                                    routeHistory.goTo('/home', {
                                        searchQuery: search.query,
                                        searchFilters:
                                            search.filters.length > 0
                                                ? search.filters
                                                : undefined,
                                    });
                                }}
                                canGoBack={routeHistory.canGoBack}
                                onGoBack={() => {
                                    const previous = routeHistory.goBack();
                                    if (previous?.path === '/home') {
                                        const homeState = isHomeRouteState(
                                            previous.state
                                        )
                                            ? previous.state
                                            : undefined;
                                        search.setSearchState({
                                            query: homeState?.searchQuery ?? '',
                                            filters:
                                                homeState?.searchFilters ?? [],
                                        });
                                    }
                                }}
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
                    <Route
                        path="/"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <></>
                            </ProtectedLayout>
                        }
                    />

                    <Route
                        path="/home"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <HomeView
                                    searchQuery={search.debouncedQuery}
                                    filters={search.debouncedFilters}
                                />
                            </ProtectedLayout>
                        }
                    />

                    <Route
                        path="/lyrics"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <LyricsView />
                            </ProtectedLayout>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <ProfileView
                                    profile={profile}
                                    connection={connection}
                                    onLogout={logout}
                                />
                            </ProtectedLayout>
                        }
                    />
                    <Route
                        path="/queue"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <QueueView />
                            </ProtectedLayout>
                        }
                    />
                    <Route
                        path="/media"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <MediaView />
                            </ProtectedLayout>
                        }
                    />
                    <Route
                        path="/playlist"
                        element={
                            <ProtectedLayout
                                when={mustLogin}
                                redirectTo="/login"
                            >
                                <PlaylistView />
                            </ProtectedLayout>
                        }
                    />

                    <Route
                        path="/login"
                        element={
                            <ProtectedLayout
                                when={mustLogout}
                                redirectTo="/home"
                            >
                                <LoginView onLogin={login} />
                            </ProtectedLayout>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                <ReauthDialog
                    open={mustReauth}
                    reasons={needsReauth ? ['missing-scopes'] : []}
                    missingScopes={missingScopes}
                    onReconnect={handleReauth}
                />

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
                min: widthBounds.min,
                max: widthBounds.max,
                override: appState.layout.widthOverride,
            }}
            height={{
                value: appState.layout.height,
                min: heightBounds.min,
                max: heightBounds.max,
                override: appState.layout.heightOverride,
            }}
            onWidthChange={appState.setWidth}
            onHeightChange={appState.setHeight}
        >
            {appContent}
        </Resizer>
    );
}
