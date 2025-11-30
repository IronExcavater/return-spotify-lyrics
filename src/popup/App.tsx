import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { ProfileView } from './views/ProfileView';
import { Avatar, Flex } from '@radix-ui/themes';
import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useMatch,
    useNavigate,
} from 'react-router-dom';
import { LyricsView } from './views/LyricsView';
import { SimpleBar } from './components/SimpleBar';
import { LoginView } from './views/LoginView';
import { Resizer } from './Resizer';
import { PersonIcon } from '@radix-ui/react-icons';

function AdvancedBar() {
    return null;
}

export default function App() {
    const { authed, profile, login, logout } = useAuth();
    const navigate = useNavigate();
    const isHome = useMatch('/');

    const [expanded, setExpanded] = useState(false);

    const widthSize = { min: 300, max: 600 };
    const heightSize = { min: isHome ? 100 : 300, max: 400 };
    const heightOverride = isHome ? 0 : undefined;

    const image = profile?.images?.[0]?.url;

    return (
        <Resizer
            widthSize={widthSize}
            heightSize={heightSize}
            heightOverride={heightOverride}
        >
            <Flex
                direction="column"
                style={{
                    background: 'var(--color-panel-solid)',
                    borderBottom: '2px solid var(--gray-a6)',
                }}
            >
                {/* Top row */}
                <Flex align="center" gap="2" justify="between">
                    <SimpleBar expanded={expanded} setExpanded={setExpanded} />

                    <Avatar
                        fallback={<PersonIcon />}
                        radius="full"
                        src={image}
                        className="cursor-pointer"
                        onClick={() => navigate('/profile')}
                    />
                </Flex>

                {/* Advanced bar row */}
                {expanded && <AdvancedBar />}
            </Flex>
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
