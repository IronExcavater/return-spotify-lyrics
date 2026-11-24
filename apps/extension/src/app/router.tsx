import { Navigate, createHashRouter } from 'react-router';

import HomePage from '@/features/home/HomePage';

import RouteErrorPage from './errors/RouteErrorPage';
import type { AppRouteHandle } from './resize/types';
import AppShell from './shell/AppShell';

const router = createHashRouter([
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
        ],
    },
]);

export default router;
