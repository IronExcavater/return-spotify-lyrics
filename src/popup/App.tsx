import { useEffect, useMemo, useRef, useState } from 'react';
import { PersonIcon } from '@radix-ui/react-icons';
import { Flex } from '@radix-ui/themes';
import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { AvatarButton } from './components/AvatarButton';
import { HomeBar } from './components/HomeBar';
import { NavBar } from './components/NavBar';
import { PlaybackBar } from './components/PlaybackBar';
import { ProtectedLayout } from './components/ProtectedLayout';
import { SearchFilters } from './components/SearchFilters';
import { useAppState, BarKey } from './hooks/useAppState';

import { usePlayer } from './hooks/usePlayer.ts';
import { usePortalSlot } from './hooks/usePortalSlot';
import { Resizer } from './hooks/useResize.tsx';
import { HomeRouteState, useRouteHistory } from './hooks/useRouteHistory';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import { SearchFilters as Filters, SearchType } from './hooks/useSpotifySearch';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { LyricsView } from './views/LyricsView';
import { MediaView } from './views/MediaView';
import { ProfileView } from './views/ProfileView';

const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];
const AVAILABLE_TYPES: SearchType[] = [
    'track',
    'artist',
    'album',
    'playlist',
    'show',
    'episode',
];
const DEFAULT_TYPES: SearchType[] = ['track', 'artist', 'album', 'playlist'];
const EMPTY_FILTERS: Filters = {
    artist: '',
    album: '',
    year: '',
    genre: '',
};

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const widthBounds = { min: 350, max: 500 } as const;
    const heightBounds = { min: 300, max: 600 } as const;

    const { authed, profile, login, logout, connection } = useSpotifyAuth();
    const appState = useAppState({
        fallbackWidth: widthBounds.min,
        fallbackHeight: heightBounds.min,
    });
    const { playback } = usePlayer();
    const routeHistory = useRouteHistory();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchTypes, setSearchTypes] = useState<SearchType[]>(DEFAULT_TYPES);
    const [searchFilters, setSearchFilters] = useState<Filters>(EMPTY_FILTERS);

    const profileImage = profile?.images?.[0]?.url;
    const hasSearchQuery = searchQuery.trim().length > 0;

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
        const state = location.state as HomeRouteState | null;
        if (state?.searchQuery !== undefined) {
            setSearchQuery(state.searchQuery);
        }
    }, [location.pathname, location.state]);

    useEffect(() => {
        if (searchQuery.trim().length === 0) {
            setSearchFilters(EMPTY_FILTERS);
        }
    }, [searchQuery]);

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
            />
        ),
        [profileImage, location.pathname, navigate]
    );

    const navSlot = useMemo(
        () => (
            <NavBar
                active={appState.activeBar}
                canShowPlayback={playback != null}
                onShowHome={() => appState.setActiveBar('home')}
                onShowPlayback={() => appState.setActiveBar('playback')}
            />
        ),
        [appState.activeBar, playback, appState.setActiveBar]
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
            <Flex direction="column" className="h-full">
                {/* Top bar */}
                {appState.showBars && (
                    <Flex className="border-b-2 border-[var(--gray-a6)] bg-[var(--color-panel-solid)]">
                        {appState.activeBar === 'playback' && (
                            <PlaybackBar
                                profileSlot={profileFloating.anchors.playback}
                                navSlot={navFloating.anchors.playback}
                                expanded={appState.playbackExpanded}
                                onExpandedChange={appState.setPlaybackExpanded}
                            />
                        )}

                        {appState.activeBar === 'home' && (
                            <HomeBar
                                profileSlot={profileFloating.anchors.home}
                                navSlot={navFloating.anchors.home}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onClearSearch={() => {
                                    setSearchQuery('');
                                    setSearchFilters(EMPTY_FILTERS);
                                    if (location.pathname === '/home') {
                                        routeHistory.goTo('/home', {
                                            searchQuery: '',
                                        });
                                    }
                                }}
                                onSearchSubmit={() => {
                                    const next = searchQuery.trim();
                                    setSearchQuery(next);
                                    routeHistory.goTo('/home', {
                                        searchQuery: next,
                                    });
                                }}
                                canGoBack={routeHistory.canGoBack}
                                onGoBack={routeHistory.goBack}
                                searchOptionsSlot={
                                    hasSearchQuery ? (
                                        <SearchFilters
                                            types={searchTypes}
                                            availableTypes={AVAILABLE_TYPES}
                                            filters={searchFilters}
                                            onTypesChange={setSearchTypes}
                                            onFiltersChange={setSearchFilters}
                                            onClearFilters={() =>
                                                setSearchFilters(EMPTY_FILTERS)
                                            }
                                        />
                                    ) : null
                                }
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
                                    searchQuery={searchQuery}
                                    types={searchTypes}
                                    filters={searchFilters}
                                />
                            </ProtectedLayout>
                        }
                    />

                    <Route
                        path="/media/:type/:id"
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
                        path="/login"
                        element={
                            <ProtectedLayout when={mustLogout} redirectTo="/">
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
    );
}
