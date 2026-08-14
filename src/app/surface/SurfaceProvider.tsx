import { createContext, useContext, type ReactNode } from 'react';

import type { Surface } from './types';

const SurfaceContext = createContext<Surface | null>(null);

type SurfaceProviderProps = {
    surface: Surface;
    children: ReactNode;
};

export function SurfaceProvider({ surface, children }: SurfaceProviderProps) {
    return (
        <SurfaceContext.Provider value={surface}>
            {children}
        </SurfaceContext.Provider>
    );
}

export function useSurface(): Surface {
    const surface = useContext(SurfaceContext);

    if (!surface) {
        throw new Error('useSurface must be used inside SurfaceProvider');
    }

    return surface;
}
