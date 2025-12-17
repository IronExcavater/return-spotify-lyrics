import { useMemo, useState } from 'react';
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
import { useAppState, BarKey } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';

import { usePlayer } from './hooks/usePlayer.ts';
import { usePortalSlot } from './hooks/usePortalSlot';
import { Resizer } from './hooks/useResize.tsx';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { LyricsView } from './views/LyricsView';
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
    const { playback } = usePlayer();

    const [searchQuery, setSearchQuery] = useState('');

    const profileImage = profile?.images?.[0]?.url;

    // Auth semantics
    const mustLogin = authed === false && authed !== undefined;
    const mustLogout = authed === true;

    // Slots
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
                    if (location.pathname === '/profile') navigate(-1);
                    else navigate('/profile');
                }}
                aria-pressed={location.pathname === '/profile'}
            />
        ),
        [profileImage]
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
                                onClearSearch={() => setSearchQuery('')}
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
                                <HomeView searchQuery={searchQuery} />
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
