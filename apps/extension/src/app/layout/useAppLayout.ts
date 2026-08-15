import { useEffect, useMemo, useState } from 'react';
import { useMatches } from 'react-router';

import { useSurface } from '@/app/surface/SurfaceProvider';

import { popupSizeStorage } from './popupSizeStorage';
import { resolveAppLayout } from './resolveAppLayout';
import { POPUP } from './surfaces';
import type { AppRouteHandle, RouteLayout } from './types';

function isAppRouteHandle(handle: unknown): handle is AppRouteHandle {
    return typeof handle === 'object' && handle !== null && 'layout' in handle;
}

function findRouteLayout(
    matches: ReturnType<typeof useMatches>
): RouteLayout | undefined {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
        const match = matches[index];
        if (match && isAppRouteHandle(match.handle) && match.handle.layout) {
            return match.handle.layout;
        }
    }

    return undefined;
}

export function useAppLayout() {
    const surface = useSurface();
    const matches = useMatches();
    const routeLayout = findRouteLayout(matches);
    const [rememberedPopupSize, setRememberedPopupSize] = useState({
        width: POPUP.width,
        height: POPUP.height,
    });

    useEffect(() => {
        if (surface !== 'popup') return;

        let active = true;
        void popupSizeStorage.getValue().then((value) => {
            if (active) setRememberedPopupSize(value);
        });

        const unwatch = popupSizeStorage.watch((value) => {
            if (active) setRememberedPopupSize(value);
        });

        return () => {
            active = false;
            unwatch();
        };
    }, [surface]);

    return useMemo(
        () =>
            resolveAppLayout({
                surface,
                rememberedPopupSize,
                routeLayout,
            }),
        [rememberedPopupSize, routeLayout, surface]
    );
}
