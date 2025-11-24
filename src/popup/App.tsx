import React from 'react';
import { useAuth } from './hooks/useAuth';
import { ProfileView } from './views/ProfileView';
import { Flex, Theme } from '@radix-ui/themes';
import { Navbar } from './components/Navbar';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomeView } from './views/HomeView';
import { LyricsView } from './views/LyricsView';
import { usePlayer } from './hooks/usePlayer';
import { PlaybackBar } from './components/PlaybackBar';
import { LoginView } from './views/LoginView';
import { PopupSizer } from './PopupSizer';

export default function App() {
    const { authed, profile, login, logout } = useAuth();
    const { playback, play, pause, next, previous, seek, shuffle } =
        usePlayer();

    return (
        <Theme
            appearance="dark"
            accentColor="grass"
            panelBackground="translucent"
        >
            <PopupSizer>
                <Navbar profile={profile} />
                <Flex m="3" flexGrow="1" flexShrink="0">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <ProtectedLayout
                                    when={authed == true}
                                    redirectTo="/login"
                                >
                                    <HomeView />
                                </ProtectedLayout>
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <ProtectedLayout
                                    when={authed == false}
                                    redirectTo="/"
                                >
                                    <LoginView onLogin={login} />
                                </ProtectedLayout>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedLayout
                                    when={authed == true}
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
                            path="/lyrics"
                            element={
                                <ProtectedLayout
                                    when={authed == true}
                                    redirectTo="/login"
                                >
                                    <LyricsView />
                                </ProtectedLayout>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Flex>
                <PlaybackBar
                    playback={playback}
                    play={play}
                    pause={pause}
                    next={next}
                    previous={previous}
                    seek={seek}
                    shuffle={shuffle}
                />
            </PopupSizer>
        </Theme>
    );
}

interface ProtectedLayoutProps {
    when: boolean;
    redirectTo: string;
    children: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
    when,
    redirectTo,
    children,
}) => {
    const location = useLocation();

    if (!when)
        return <Navigate to={redirectTo} replace state={{ from: location }} />;

    return <>{children}</>;
};
