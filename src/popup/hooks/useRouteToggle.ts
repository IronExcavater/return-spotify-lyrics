import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

    useEffect(() => {
        if (!trackHistory) return;
        if (location.pathname !== targetPath) {
            lastNonTargetRoute.current = location.pathname;
        }
    }, [location.pathname, targetPath, trackHistory]);

    const toggle = useCallback(() => {
        if (location.pathname === targetPath) {
            const fallback = trackHistory
                ? (lastNonTargetRoute.current ?? fallbackPath)
                : fallbackPath;
            navigate(fallback, { replace: true });
        } else {
            navigate(targetPath);
        }
    }, [fallbackPath, location.pathname, navigate, targetPath, trackHistory]);

    const isActive = location.pathname === targetPath;

    return { isActive, toggle };
}
