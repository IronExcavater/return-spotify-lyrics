import { useEffect, useMemo, useRef } from 'react';
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
import { SettingsProvider } from './context/SettingsContext';
import { useAppState, BarKey } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';

import type { HomeRouteState, RouteState } from './hooks/useHistory';
import { usePlayer } from './hooks/usePlayer.ts';
import { usePortalSlot } from './hooks/usePortalSlot';
import { Resizer } from './hooks/useResize.tsx';
import { useSearch } from './hooks/useSearch';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { LyricsView } from './views/LyricsView';
import { MediaView } from './views/MediaView';
import { ProfileView } from './views/ProfileView';

const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const widthBounds = { min: 350, max: 500 } as const;
    const heightBounds = { min: 300, max: 600 } as const;

    const { authed, profile, login, logout, connection } = useAuth();
    const appState = useAppState({
        fallbackWidth: widthBounds.min,
        fallbackHeight: heightBounds.min,
    });
    const routeHistory = useHistory();
    const { playback } = usePlayer();

    const search = useSearch();
    const trackSearch = useMemo(() => createAnalyticsTracker('search'), []);

    const profileImage = profile?.images?.[0]?.url;

    const isHomeRouteState = (
        state: RouteState | null | undefined
    ): state is HomeRouteState =>
        !!state && ('searchQuery' in state || 'searchFilters' in state);

    // Auth semantics
    const mustLogin = authed === false && authed !== undefined;
    const mustLogout = authed === true;

    // Slots
    const lastContentPathRef = useRef('/home');

    useEffect(() => {
        if (location.pathname !== '/profile')
            lastContentPathRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname !== '/home') return;
        const state = location.state as RouteState | null;
        const homeState = isHomeRouteState(state) ? state : undefined;
        const nextQuery = homeState?.searchQuery ?? '';
        const nextFilters = homeState?.searchFilters ?? [];
        search.setSearchState({ query: nextQuery, filters: nextFilters });
    }, [location.pathname, location.state, search.setSearchState]);

    useEffect(() => {
        if (location.pathname !== '/home') return;
        routeHistory.rememberState({
            searchQuery: search.debouncedQuery,
            searchFilters:
                search.debouncedFilters.length > 0
                    ? search.debouncedFilters
                    : undefined,
        });
    }, [
        location.pathname,
        routeHistory.rememberState,
        search.debouncedFilters,
        search.debouncedQuery,
    ]);

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
                    if (location.pathname === '/profile')
                        navigate(lastContentPathRef.current || '/home', {
                            replace: true,
                        });
                    else navigate('/profile');
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
                canShowPlayback={!!playback}
                onShowHome={() => appState.setActiveBar('home')}
                onShowPlayback={() => appState.setActiveBar('playback')}
            />
        ),
        [appState.activeBar, appState.setActiveBar, playback]
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

    return (
        <SettingsProvider>
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
                <Flex direction="column" className="h-full">
                    {/* Top bar */}
                    {appState.showBars && (
                        <Flex className="border-b-2 border-[var(--gray-a6)] bg-[var(--color-panel-solid)]">
                            {appState.activeBar === 'playback' && (
                                <PlaybackBar
                                    profileSlot={
                                        profileFloating.anchors.playback
                                    }
                                    navSlot={navFloating.anchors.playback}
                                    expanded={appState.playbackExpanded}
                                    onExpandedChange={
                                        appState.setPlaybackExpanded
                                    }
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
                                                query:
                                                    homeState?.searchQuery ??
                                                    '',
                                                filters:
                                                    homeState?.searchFilters ??
                                                    [],
                                            });
                                        }
                                    }}
                                    filters={search.filters}
                                    availableFilters={search.available}
                                    onAddFilter={search.addFilter}
                                    onUpdateFilter={search.updateFilter}
                                    onRemoveFilter={search.removeFilter}
                                    onClearFilters={search.clearFilters}
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
                            path="/login"
                            element={
                                <ProtectedLayout
                                    when={mustLogout}
                                    redirectTo="/"
                                >
                                    <LoginView onLogin={login} />
                                </ProtectedLayout>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>

                    {profileFloating.portal}
                    {navFloating.portal}
                </Flex>
            </Resizer>
        </SettingsProvider>
    );
}
