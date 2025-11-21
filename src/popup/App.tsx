import React from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { Spinner } from './components/Spinner';

export default function App() {
    const { authed, profile, login, logout } = useAuth();

    if (authed === null) {
        return <Spinner />;
    }

    if (!authed) {
        return <LoginView onLogin={login} />;
    }

    if (!profile) {
        return <Spinner />;
    }

    return <ProfileView profile={profile} onLogout={logout} />;
}
