import { useEffect, useMemo, useState } from 'react';
import { Flex } from '@radix-ui/themes';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { PersonIcon } from '@radix-ui/react-icons';
import { useAuth } from './hooks/useAuth';
import { HomeView } from './views/HomeView';
import { LyricsView } from './views/LyricsView';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { PlaybackBar } from './components/PlaybackBar';
import { HomeBar } from './components/HomeBar';
import { NavBar } from './components/NavBar';
import { Resizer } from './Resizer';
import { AvatarButton } from './components/AvatarButton';
import { ProtectedLayout } from './components/ProtectedLayout';
import { usePortalSlot } from './hooks/usePortalSlot';

type BarKey = 'home' | 'playback';
const BAR_KEYS: readonly BarKey[] = ['home', 'playback'];

export default function App() {
    const { authed, profile, login, logout } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeBar, setActiveBar] = useState<BarKey | undefined>('home');

    const widthSize = { min: 300, max: 500 };
    const heightSize = { min: 400, max: 600 };

    const profileImage = profile?.images?.[0]?.url;
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
                aria-label="Open profile"
                onClick={() => navigate('/profile')}
            />
        ),
        [navigate, profileImage]
    );

    const navSlot = useMemo(
        () => (
            <NavBar
                active={activeBar ?? 'home'}
                canShowPlayback
                onShowHome={() => setActiveBar('home')}
                onShowPlayback={() => setActiveBar('playback')}
            />
        ),
        [activeBar]
    );

    useEffect(() => {
        if (authed === false) {
            setActiveBar(undefined);
            return;
        }

        if (authed === true) {
            setActiveBar((prev) => (prev === undefined ? 'home' : prev));
        }
    }, [authed]);

    const showBars = activeBar !== undefined;
    const profileFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: profileSlot,
        activeKey: activeBar,
        defaultKey: 'home',
        enabled: showBars,
    });
    const navFloating = usePortalSlot<BarKey>({
        keys: BAR_KEYS,
        content: navSlot,
        activeKey: activeBar,
        defaultKey: 'home',
        enabled: showBars,
    });

    return (
        <Resizer widthSize={widthSize} heightSize={heightSize}>
            <Flex direction="column">
                {showBars && (
                    <Flex
                        direction="row"
                        align="center"
                        className="border-b-2 border-[var(--gray-a6)] bg-[var(--color-panel-solid)]"
                    >
                        {activeBar === 'playback' && (
                            <PlaybackBar
                                profileSlot={profileFloating.anchors.playback}
                                navSlot={navFloating.anchors.playback}
                            />
                        )}

                        {activeBar === 'home' && (
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

                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedLayout
                                when={authed == false && authed !== undefined}
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
                                when={authed == false && authed !== undefined}
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
                                when={authed == false && authed !== undefined}
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
                                when={authed == false && authed !== undefined}
                                redirectTo="/login"
                            >
                                <ProfileView
                                    profile={profile}
                                    onLogout={logout}
                                />
                            </ProtectedLayout>
                        }
                    />
                    <Route
                        path="/login"
                        element={
                            <ProtectedLayout
                                when={authed == true && authed !== undefined}
                                redirectTo="/login"
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
    );
}
