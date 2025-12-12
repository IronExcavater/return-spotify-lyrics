import { useMemo, useState } from 'react';
import { Flex } from '@radix-ui/themes';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { PersonIcon } from '@radix-ui/react-icons';

import { useAuth } from './hooks/useAuth';
import { usePlayer } from './hooks/usePlayer';
import { HomeView } from './views/HomeView';
import { LyricsView } from './views/LyricsView';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { PlaybackBar } from './components/PlaybackBar';
import { HomeBar } from './components/HomeBar';
import { NavBar } from './components/NavBar';
import { Resizer } from './Resizer';
import { AvatarButton } from './components/AvatarButton';

export default function App() {
    const { profile, login, logout } = useAuth();
    const { playback } = usePlayer();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeBar, setActiveBar] = useState<'home' | 'playback'>('home');

    const widthSize = { min: 320, max: 640 };
    const heightSize = { min: 280, max: 480 };

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
                active={activeBar}
                canShowPlayback
                onShowHome={() => setActiveBar('home')}
                onShowPlayback={() => setActiveBar('playback')}
            />
        ),
        [activeBar]
    );

    return (
        <Resizer widthSize={widthSize} heightSize={heightSize}>
            <Flex direction="column">
                <Flex direction="row">
                    {activeBar === 'playback' && (
                        <PlaybackBar
                            profileSlot={profileSlot}
                            navSlot={navSlot}
                        />
                    )}
                    {activeBar === 'home' && (
                        <HomeBar
                            profileSlot={profileSlot}
                            navSlot={navSlot}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onClearSearch={() => setSearchQuery('')}
                        />
                    )}
                </Flex>

                <Routes>
                    <Route
                        path="/"
                        element={<HomeView searchQuery={searchQuery} />}
                    />
                    <Route
                        path="/home"
                        element={<HomeView searchQuery={searchQuery} />}
                    />
                    <Route path="/lyrics" element={<LyricsView />} />
                    <Route
                        path="/profile"
                        element={
                            <ProfileView profile={profile} onLogout={logout} />
                        }
                    />
                    <Route
                        path="/login"
                        element={<LoginView onLogin={login} />}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Flex>
        </Resizer>
    );
}
