import { useMemo, type ReactNode } from 'react';
import type { UserProfile } from '@spotify/web-api-ts-sdk';

import type { SpotifyAuthNotice } from '../features/auth/spotifyAuthNotices';
import type { SpotifyConnectionMeta } from '../hooks/useAuth';
import type { SearchState } from '../hooks/useSearch';
import { lazyNamed } from './lazyNamed';

const HomeView = lazyNamed(() => import('../views/HomeView'), 'HomeView');
const LyricsView = lazyNamed(() => import('../views/LyricsView'), 'LyricsView');
const ProfileView = lazyNamed(
    () => import('../views/ProfileView'),
    'ProfileView'
);
const QueueView = lazyNamed(() => import('../views/QueueView'), 'QueueView');
const MediaView = lazyNamed(() => import('../views/MediaView'), 'MediaView');
const PlaylistView = lazyNamed(
    () => import('../views/PlaylistView'),
    'PlaylistView'
);
const LoginView = lazyNamed(() => import('../views/LoginView'), 'LoginView');

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
    authNotices: SpotifyAuthNotice[];
    searchState: SearchState;
};

export function useAppRoutes({
    mustLogin,
    mustLogout,
    login,
    logout,
    profile,
    connection,
    authNotices,
    searchState,
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
                element: <HomeView search={searchState} />,
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
                element: (
                    <LoginView authNotices={authNotices} onLogin={login} />
                ),
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
            authNotices,
            searchState,
        ]
    );
}
