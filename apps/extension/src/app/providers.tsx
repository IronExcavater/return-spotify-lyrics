import type { ReactNode } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppErrorBoundary } from '@/errors/AppErrorBoundary';
import { appQueryClient } from '@/queries/client';

import { SurfaceProvider } from './surface/SurfaceProvider';
import type { Surface } from './surface/types';

type AppProvidersProps = {
    surface: Surface;
    children: ReactNode;
};

export function AppProviders({ surface, children }: AppProvidersProps) {
    return (
        <SurfaceProvider surface={surface}>
            <QueryClientProvider client={appQueryClient}>
                <Tooltip.Provider>
                    <AppErrorBoundary>{children}</AppErrorBoundary>
                </Tooltip.Provider>
            </QueryClientProvider>
        </SurfaceProvider>
    );
}
