import { useMemo, type ReactNode } from 'react';
import type { UserProfile } from '@spotify/web-api-ts-sdk';

import type { SpotifyConnectionMeta } from '../hooks/useAuth';
import { HomeView } from '../views/HomeView';
import { LoginView } from '../views/LoginView';
import { LyricsView } from '../views/LyricsView';
import { MediaView } from '../views/MediaView';
import { PlaylistView } from '../views/PlaylistView';
import { ProfileView } from '../views/ProfileView';
import { QueueView } from '../views/QueueView';

export type AppRouteDefinition = {
    path: string;
    element: ReactNode;
    when: boolean;
    redirectTo: string;
};

type UseAppRoutesOptions = {
    mustLogin: boolean;
    mustLogout: boolean;
    login: () => void;
    logout: () => void;
    profile?: UserProfile;
    connection?: SpotifyConnectionMeta;
    searchQuery: string;
    searchFilters: Parameters<typeof HomeView>[0]['filters'];
};

export function useAppRoutes({
    mustLogin,
    mustLogout,
    login,
    logout,
    profile,
    connection,
    searchQuery,
    searchFilters,
}: UseAppRoutesOptions) {
    return useMemo<AppRouteDefinition[]>(
        () => [
            {
                path: '/',
                element: <></>,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/home',
                element: (
                    <HomeView
                        searchQuery={searchQuery}
                        filters={searchFilters}
                    />
                ),
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/lyrics',
                element: <LyricsView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/profile',
                element: (
                    <ProfileView
                        profile={profile}
                        connection={connection}
                        onLogout={logout}
                    />
                ),
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/queue',
                element: <QueueView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/media',
                element: <MediaView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/playlist',
                element: <PlaylistView />,
                when: mustLogin,
                redirectTo: '/login',
            },
            {
                path: '/login',
                element: <LoginView onLogin={login} />,
                when: mustLogout,
                redirectTo: '/home',
            },
        ],
        [
            connection,
            login,
            logout,
            mustLogin,
            mustLogout,
            profile,
            searchFilters,
            searchQuery,
        ]
    );
}
