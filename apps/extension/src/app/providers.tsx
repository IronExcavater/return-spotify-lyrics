import type { ReactNode } from 'react';

import AppErrorBoundary from './errors/AppErrorBoundary';
import SurfaceProvider from './surface/SurfaceProvider';
import type { Surface } from './surface/types';

type AppProvidersProps = {
    surface: Surface;
    children: ReactNode;
};

export default function AppProviders({ surface, children }: AppProvidersProps) {
    return (
        <SurfaceProvider surface={surface}>
            <AppErrorBoundary>{children}</AppErrorBoundary>
        </SurfaceProvider>
    );
}
