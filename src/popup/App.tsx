import React from 'react';
import { useAuth } from './hooks/useAuth';
import { ProfileView } from './views/ProfileView';
import { Theme } from '@radix-ui/themes';
import { Navbar } from './components/Navbar';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HomeView } from './views/HomeView';
import { LyricsView } from './views/LyricsView';
import { usePlayer } from './hooks/usePlayer';
import { PlaybackBar } from './components/PlaybackBar';
import { LoginView } from './views/LoginView';

export default function App() {
    const { authed, profile, login, logout } = useAuth();
    const { playback, play, pause, next, previous } = usePlayer();

    return (
        <Theme
            appearance="dark"
            accentColor="grass"
            panelBackground="translucent"
        >
            <Navbar profile={profile} />
            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedLayout isAuthed={authed}>
                            <HomeView />
                        </ProtectedLayout>
                    }
                />
                <Route path="/login" element={<LoginView onLogin={login} />} />
                <Route
                    path="/profile"
                    element={
                        <ProtectedLayout isAuthed={authed}>
                            <ProfileView profile={profile} onLogout={logout} />
                        </ProtectedLayout>
                    }
                />
                <Route
                    path="/lyrics"
                    element={
                        <ProtectedLayout isAuthed={authed}>
                            <LyricsView />
                        </ProtectedLayout>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <PlaybackBar
                playback={playback}
                play={play}
                pause={pause}
                next={next}
                previous={previous}
            />
        </Theme>
    );
}

interface ProtectedLayoutProps {
    isAuthed: boolean | undefined;
    children: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({
    isAuthed,
    children,
}) => {
    const location = useLocation();

    if (!isAuthed)
        return <Navigate to="/login" replace state={{ from: location }} />;

    return <>{children}</>;
};
