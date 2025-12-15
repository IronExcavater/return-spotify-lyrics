import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth.ts';
import { usePlayer } from './usePlayer.ts';
import { getFromStorage, setInStorage } from '../../shared/storage';

export type BarKey = 'home' | 'playback';

export const ROUTES = {
    root: '/',
    home: '/home',
    login: '/login',
    lyrics: '/lyrics',
    profile: '/profile',
} as const;

type BarRule = {
    defaultRoute: string;
};

const BAR_RULES: Record<BarKey, BarRule> = {
    home: {
        defaultRoute: ROUTES.home,
    },
    playback: {
        defaultRoute: ROUTES.lyrics,
    },
};

type RouteRule = {
    allowedBars?: BarKey[];
    widthOverride?: number;
    heightOverride?: number | 'auto';
};

const ROUTE_RULES: Record<string, RouteRule> = {
    [ROUTES.root]: {
        heightOverride: 'auto',
    },
    [ROUTES.home]: {
        allowedBars: ['home', 'playback'],
    },
    [ROUTES.lyrics]: {
        allowedBars: ['playback'],
    },
    [ROUTES.login]: {
        widthOverride: 300,
        heightOverride: 'auto',
    },
};

const LAST_ROUTE_KEY = 'lastRoute';
const WIDTH_KEY = 'popupWidth';
const HEIGHT_KEY = 'popupHeight';

export function useAppState() {
    const { authed } = useAuth();
    const { playback } = usePlayer();

    const isPlaying = Boolean(playback?.is_playing && playback?.item);

    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isProfileRoute = pathname === ROUTES.profile;

    const [baseWidth, setBaseWidth] = useState(420);
    const [baseHeight, setBaseHeight] = useState(500);
    const [hasBootstrappedRoute, setHasBootstrappedRoute] = useState(false);

    // Active bar
    const preferredBarForRoute: BarKey = useMemo(() => {
        return pathname === ROUTES.lyrics ? 'playback' : 'home';
    }, [pathname]);

    const activeBar: BarKey | undefined = useMemo(() => {
        if (authed === false) return undefined;
        if (authed === undefined) return preferredBarForRoute;
        return isPlaying ? 'playback' : 'home';
    }, [authed, isPlaying, preferredBarForRoute]);

    const showBars = activeBar !== undefined;

    // Route enforcement
    useEffect(() => {
        if (!activeBar) return;

        const rule = ROUTE_RULES[pathname];
        if (!rule || !rule.allowedBars) return;

        if (!rule.allowedBars.includes(activeBar)) {
            navigate(BAR_RULES[activeBar].defaultRoute, { replace: true });
        }
    }, [pathname, activeBar, navigate]);

    // Layout derivation
    const routeRule = ROUTE_RULES[pathname];

    const widthOverride = routeRule?.widthOverride;
    const heightOverride = routeRule?.heightOverride;

    const width = widthOverride !== undefined ? widthOverride : baseWidth;
    const height = heightOverride !== undefined ? heightOverride : baseHeight;

    // Persisted dimensions
    useEffect(() => {
        void getFromStorage<number>(WIDTH_KEY).then((saved) => {
            if (typeof saved === 'number') setBaseWidth(saved);
        });
        void getFromStorage<number>(HEIGHT_KEY).then((saved) => {
            if (typeof saved === 'number') setBaseHeight(saved);
        });
    }, []);

    // Profile toggle memory
    const lastNonProfileRoute = useRef<string>(ROUTES.home);

    useEffect(() => {
        if (pathname !== ROUTES.profile) {
            lastNonProfileRoute.current = pathname;
        }
    }, [pathname]);

    const toggleProfile = useCallback(() => {
        if (pathname === ROUTES.profile) {
            navigate(lastNonProfileRoute.current || ROUTES.home);
        } else {
            navigate(ROUTES.profile);
        }
    }, [navigate, pathname]);

    // Explicit navigation intents
    const goHome = useCallback(() => {
        navigate(ROUTES.home);
    }, [navigate]);

    const goLyrics = useCallback(() => {
        navigate(ROUTES.lyrics);
    }, [navigate]);

    // Restore previously active route when the popup is reopened.
    useEffect(() => {
        if (hasBootstrappedRoute) return;

        let cancelled = false;
        void getFromStorage<string>(LAST_ROUTE_KEY).then((stored) => {
            if (cancelled) return;

            const target =
                stored && stored !== ROUTES.root ? stored : ROUTES.home;

            if (pathname !== target) {
                navigate(target, { replace: true });
            }

            setHasBootstrappedRoute(true);
        });

        return () => {
            cancelled = true;
        };
    }, [hasBootstrappedRoute, navigate, pathname]);

    // Persist the latest route so the next popup session can restore it.
    useEffect(() => {
        if (!hasBootstrappedRoute) return;

        const toPersist = pathname === ROUTES.root ? ROUTES.home : pathname;
        void setInStorage(LAST_ROUTE_KEY, toPersist);
    }, [pathname, hasBootstrappedRoute]);

    return {
        activeBar,
        showBars,
        isProfileRoute,

        layout: {
            width,
            height,
            widthOverride,
            heightOverride,
        },

        setWidth: useCallback((value: number) => {
            setBaseWidth(value);
            void setInStorage(WIDTH_KEY, value);
        }, []),
        setHeight: useCallback((value: number) => {
            setBaseHeight(value);
            void setInStorage(HEIGHT_KEY, value);
        }, []),

        goHome,
        goLyrics,
        toggleProfile,
    };
}
