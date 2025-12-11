import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { ProfileView } from './views/ProfileView';
import { Flex } from '@radix-ui/themes';
import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useMatch,
    useNavigate,
} from 'react-router-dom';
import { LyricsView } from './views/LyricsView';
import { LoginView } from './views/LoginView';
import { Resizer } from './Resizer';
import { PlaybackBar } from './components/PlaybackBar';
import { HomeBar } from './components/HomeBar';
import { AvatarButton } from './components/AvatarButton';
import { PersonIcon } from '@radix-ui/react-icons';
import { usePlayer } from './hooks/usePlayer';
import { useRouteToggle } from './hooks/useRouteToggle';
import { HomeView } from './views/HomeView';
import { getFromStorage, setInStorage } from '../shared/storage';

const NAV_EXPANDED_KEY = 'playbackExpanded';
const LAST_ROUTE_KEY = 'lastNavRoute';

export default function App() {
    const { authed, profile, login, logout } = useAuth();
    const { playback } = usePlayer();
    const navigate = useNavigate();
    const location = useLocation();
    const isBlankRoute = !!useMatch('/');

    const [expanded, setExpanded] = useState(false);
    const hasPlayback = playback?.item != null;
    const restoredRouteRef = useRef(false);

    useEffect(() => {
        getFromStorage<boolean>(NAV_EXPANDED_KEY, (stored) => {
            if (typeof stored === 'boolean') setExpanded(stored);
        });
    }, []);

    useEffect(() => {
        void setInStorage(NAV_EXPANDED_KEY, expanded);
    }, [expanded]);

    useEffect(() => {
        if (authed !== true || restoredRouteRef.current) return;
        getFromStorage<string>(LAST_ROUTE_KEY, (stored) => {
            if (stored && stored !== location.pathname) {
                navigate(stored, { replace: true });
            }
            restoredRouteRef.current = true;
        });
    }, [authed, location.pathname, navigate]);

    useEffect(() => {
        if (authed !== true) return;
        const path = location.pathname;
        if (path === '/login') return;
        void setInStorage(LAST_ROUTE_KEY, path);
    }, [authed, location.pathname]);

    const { isActive: isProfileActive, toggle: toggleProfileRoute } =
        useRouteToggle('/profile');
    const showBar = authed === true;
    const widthSize = { min: 300, max: 600 };
    const heightSize = { min: showBar ? 300 : 200, max: 400 };
    const heightOverride = showBar && isBlankRoute ? 0 : undefined;

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
                active={isProfileActive}
                aria-label="Open profile"
                onClick={toggleProfileRoute}
            />
        ),
        [isProfileActive, profileImage, toggleProfileRoute]
    );

    return (
        <Resizer
            widthSize={widthSize}
            heightSize={heightSize}
            heightOverride={heightOverride}
        >
            {/* Playback and navigation bar */}
            {showBar && (
                <Flex
                    direction="column"
                    py="2"
                    px="3"
                    gap="2"
                    style={{
                        background: 'var(--color-panel-solid)',
                        borderBottom: '2px solid var(--gray-a6)',
                    }}
                >
                    {hasPlayback ? (
                        <PlaybackBar
                            expanded={expanded}
                            setExpanded={setExpanded}
                            profileSlot={profileSlot}
                        />
                    ) : (
                        <HomeBar profileSlot={profileSlot} />
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
                            <HomeView />
                        </ProtectedLayout>
                    }
                />
                <Route
                    path="/login"
                    element={
                        <ProtectedLayout
                            when={authed == true && authed !== undefined}
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
                            when={authed == false && authed !== undefined}
                            redirectTo="/login"
                        >
                            <ProfileView profile={profile} onLogout={logout} />
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
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Resizer>
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

    if (when)
        return <Navigate to={redirectTo} replace state={{ from: location }} />;

    return <>{children}</>;
};
