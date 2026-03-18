import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isSecondaryRoute } from './useAppState';

interface RouteToggleOptions {
    fallbackPath?: string;
    trackHistory?: boolean;
}

export function useRouteToggle(
    targetPath: string,
    { fallbackPath = '/', trackHistory = true }: RouteToggleOptions = {}
) {
    const navigate = useNavigate();
    const location = useLocation();
    const lastNonTargetRoute = useRef<string | null>(null);
    const lastPrimaryRoute = useRef<string | null>(null);
    const locationPathRef = useRef(location.pathname);

    useEffect(() => {
        locationPathRef.current = location.pathname;
        if (!trackHistory) return;
        if (location.pathname !== targetPath) {
            lastNonTargetRoute.current = location.pathname;
            if (!isSecondaryRoute(location.pathname)) {
                lastPrimaryRoute.current = location.pathname;
            }
        }
    }, [location.pathname, targetPath, trackHistory]);

    const toggle = useCallback(() => {
        const currentPath = locationPathRef.current;
        if (currentPath === targetPath) {
            const fallback = trackHistory
                ? (lastPrimaryRoute.current ??
                  lastNonTargetRoute.current ??
                  fallbackPath)
                : fallbackPath;
            navigate(fallback, { replace: true });
        } else {
            navigate(targetPath);
        }
    }, [fallbackPath, navigate, targetPath, trackHistory]);

    const isActive = location.pathname === targetPath;

    return { isActive, toggle };
}
