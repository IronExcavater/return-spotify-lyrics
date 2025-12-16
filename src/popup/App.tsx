import { useMemo, useState } from 'react';
import { PersonIcon } from '@radix-ui/react-icons';
import { Flex } from '@radix-ui/themes';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AvatarButton } from './components/AvatarButton';
import { HomeBar } from './components/HomeBar';
import { NavBar } from './components/NavBar';
import { PlaybackBar } from './components/PlaybackBar';
import { ProtectedLayout } from './components/ProtectedLayout';
import { useAppState, BarKey } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { usePlayer } from './hooks/usePlayer';

import { usePortalSlot } from './hooks/usePortalSlot';
import { Resizer } from './hooks/useResize.tsx';
import { HomeView } from './views/HomeView';
import { LoginView } from './views/LoginView';
import { LyricsView } from './views/LyricsView';
import { ProfileView } from './views/ProfileView';

const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];

export default function App() {
    const { authed, profile, login, logout, connection } = useAuth();
    const { playback } = usePlayer();

    const isPlaying = Boolean(playback?.is_playing && playback?.item);
    const appState = useAppState();

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
                onClick={appState.toggleProfile}
                aria-pressed={appState.isProfileRoute}
            />
        ),
        [appState.toggleProfile, appState.isProfileRoute, profileImage]
    );

    const navSlot = useMemo(
        () => (
            <NavBar
                active={appState.activeBar ?? 'home'}
                canShowPlayback={isPlaying}
                onShowHome={appState.goHome}
                onShowPlayback={appState.goLyrics}
            />
        ),
        [appState.activeBar, appState.goHome, appState.goLyrics, isPlaying]
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

    const widthBounds = { min: 350, max: 500 } as const;
    const heightBounds = { min: 300, max: 600 } as const;

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
                    {/* Idle root */}
                    <Route path="/" element={<Navigate to="/home" replace />} />

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
