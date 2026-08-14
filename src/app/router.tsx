import { Navigate, createHashRouter } from 'react-router';

import { LoginPage } from '@/features/auth/LoginPage';
import { HomePage } from '@/features/home/HomePage';
import { LyricsPage } from '@/features/lyrics/LyricsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { QueuePage } from '@/features/queue/QueuePage';
import { SettingsPage } from '@/features/settings/SettingsPage';

import { AppShell } from './AppShell';
import type { AppRouteHandle } from './layout/types';
import { RouteErrorPage } from './RouteErrorPage';

export const router = createHashRouter([
    {
        id: 'app',
        path: '/',
        element: <AppShell />,
        errorElement: <RouteErrorPage />,
        children: [
            {
                index: true,
                element: <Navigate to="/home" replace />,
            },
            {
                path: 'home',
                element: <HomePage />,
                handle: {
                    layout: { bar: 'preserve' },
                } satisfies AppRouteHandle,
            },
            {
                path: 'lyrics',
                element: <LyricsPage />,
                handle: {
                    layout: {
                        bar: 'playback',
                        popup: {
                            size: { width: 420, height: 600 },
                            resize: { width: false, height: false },
                        },
                    },
                } satisfies AppRouteHandle,
            },
            {
                path: 'queue',
                element: <QueuePage />,
                handle: {
                    layout: {
                        bar: 'playback',
                        popup: {
                            size: { width: 420, height: 600 },
                            resize: { width: false, height: false },
                        },
                    },
                } satisfies AppRouteHandle,
            },
            {
                path: 'profile',
                element: <ProfilePage />,
                handle: {
                    layout: {
                        bar: 'preserve',
                        popup: {
                            size: { width: 360, height: 'auto' },
                            resize: { width: false, height: false },
                        },
                    },
                } satisfies AppRouteHandle,
            },
            {
                path: 'settings',
                element: <SettingsPage />,
                handle: {
                    layout: { bar: 'preserve' },
                } satisfies AppRouteHandle,
            },
            {
                path: 'login',
                element: <LoginPage />,
                handle: {
                    layout: {
                        bar: 'hidden',
                        popup: {
                            size: { width: 320, height: 'auto' },
                            resize: { width: false, height: false },
                        },
                    },
                } satisfies AppRouteHandle,
            },
            {
                path: '*',
                element: <Navigate to="/home" replace />,
            },
        ],
    },
]);
