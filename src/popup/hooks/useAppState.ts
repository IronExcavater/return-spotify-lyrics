import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFromStorage, setInStorage } from '../../shared/storage';
import { useAuth } from './useAuth.ts';
import { usePlayer } from './usePlayer.ts';

export type BarKey = 'home' | 'playback';

export const ROUTES = {
    root: '/',
    home: '/home',
    login: '/login',
    lyrics: '/lyrics',
    profile: '/profile',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteValue = (typeof ROUTES)[RouteKey];

type BarRule = {
    defaultRoute: RouteValue;
};

type RouteRule = {
    allowedBars?: BarKey[];
    widthOverride?: number;
    heightOverride?: number | 'auto';
};

const BAR_RULES: Record<BarKey, BarRule> = {
    home: {
        defaultRoute: ROUTES.home,
    },
    playback: {
        defaultRoute: ROUTES.root,
    },
};

const ROUTE_RULES: Partial<Record<RouteValue, RouteRule>> = {
    [ROUTES.root]: {
        heightOverride: 'auto',
    },
    [ROUTES.home]: {
        allowedBars: ['home'],
    },
    [ROUTES.lyrics]: {
        allowedBars: ['playback'],
    },
    [ROUTES.login]: {
        widthOverride: 300,
        heightOverride: 'auto',
    },
};

const APP_STATE_KEY = 'appState';
const PLAYBACK_STALE_MS = 60_000;

type AppState = {
    width?: number;
    height?: number;
    playbackExpanded?: boolean;
    lastBar?: BarKey;
    lastRoute?: RouteValue;
};

function isRouteAllowed(pathname: RouteValue, bar: BarKey) {
    const rule = ROUTE_RULES[pathname];
    if (!rule?.allowedBars) return true;
    return rule.allowedBars.includes(bar);
}

export function useAppState() {
    const navigate = useNavigate();
    const location = useLocation();

    const { authed } = useAuth();
    const { playback } = usePlayer();

    const [hydrated, setHydrated] = useState(false);
    const [appState, setAppState] = useState<AppState>({});
    const [activeBar, setActiveBar] = useState<BarKey>('home');

    const routeRule = ROUTE_RULES[location.pathname];

    // load app state
    useEffect(() => {
        getFromStorage<AppState>(APP_STATE_KEY, (saved) => {
            setAppState(saved);

            const initialBar = saved?.lastBar ?? 'home';
            setActiveBar(initialBar);
            navigate(saved?.lastRoute ?? BAR_RULES[initialBar].defaultRoute);
            setHydrated(true);
        });
    }, []);

    // Update app state
    const updateAppState = useCallback(async (patch: Partial<AppState>) => {
        setAppState((prev) => {
            const next = { ...prev, ...patch };
            void setInStorage(APP_STATE_KEY, next);
            return next;
        });
    }, []);

    // Update last bar to active bar
    useEffect(() => {
        if (!hydrated) return;

        void updateAppState({ lastBar: activeBar });
    }, [hydrated, activeBar, updateAppState]);

    // Update last route to location.pathname
    useEffect(() => {
        if (!hydrated) return;

        void updateAppState({ lastRoute: location.pathname as RouteValue });
    }, [hydrated, location.pathname, updateAppState]);

    // Initialise after load
    const initialised = useRef(false);

    useEffect(() => {
        if (!hydrated || initialised.current) return;
        initialised.current = true;

        // switch into playback bar if playback available
        if (playback) {
            setActiveBar('playback');
            void updateAppState({ lastBar: 'playback' });
        }
    }, [hydrated, playback, initialised]);

    // track last playback change
    const lastPlaybackChange = useRef<number | null>(null);

    useEffect(() => {
        if (!hydrated) return;

        if (playback) lastPlaybackChange.current = null;

        if (lastPlaybackChange.current === null)
            lastPlaybackChange.current = Date.now();
    }, [hydrated, playback]);

    // switch out of playback bar if playback unavailable
    useEffect(() => {
        if (!hydrated) return;

        if (
            activeBar === 'playback' &&
            Date.now() >= lastPlaybackChange.current + PLAYBACK_STALE_MS
        ) {
            setActiveBar('home');
            void updateAppState({ lastBar: 'home' });
        }
    }, [hydrated, activeBar, updateAppState]);

    // Enforce route rules
    const lastEnforcedNav = useRef<{ bar: BarKey; route: RouteValue } | null>(
        null
    );

    useEffect(() => {
        if (!hydrated) return;

        let path = location.pathname as RouteValue;

        const last = lastEnforcedNav.current;
        if (last?.bar === activeBar && last.route === path) return;

        if (!isRouteAllowed(path, activeBar)) {
            const fallback = BAR_RULES[activeBar].defaultRoute;

            if (path !== fallback) {
                navigate(fallback, { replace: true });
                path = fallback;
            }
        }

        lastEnforcedNav.current = { bar: activeBar, route: path };
    }, [hydrated, activeBar, location.pathname, navigate]);

    // App size getters
    const widthOverride = routeRule?.widthOverride;
    const heightOverride = routeRule?.heightOverride;

    const width = widthOverride ?? appState.width ?? 300;
    const height = heightOverride ?? appState.height ?? 400;

    // App size setters
    const setWidth = useCallback(
        (width: number) => updateAppState({ width }),
        [updateAppState]
    );

    const setHeight = useCallback(
        (height: number) => updateAppState({ height }),
        [updateAppState]
    );

    // Playback expanded setter
    const setPlaybackExpanded = useCallback(
        (expanded: boolean) => updateAppState({ playbackExpanded: expanded }),
        [updateAppState]
    );

    // Show bars getter
    const showBars = !!authed;

    return {
        loading: !hydrated,

        showBars,
        activeBar,
        setActiveBar,

        layout: {
            width,
            height,
            widthOverride,
            heightOverride,
        },
        setWidth,
        setHeight,

        playbackExpanded: appState.playbackExpanded ?? false,
        setPlaybackExpanded,
    };

    /*
    const [playbackExpired, setPlaybackExpired] = useState(false);

    const isPlaying = Boolean(playback?.is_playing && playback?.item);
    const hasTrack = Boolean(playback?.item);

    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isProfileRoute = pathname === ROUTES.profile;

    const [baseWidth, setBaseWidth] = useState(420);
    const [baseHeight, setBaseHeight] = useState(500);
    const [playbackExpanded, setPlaybackExpanded] = useState(false);
    const [persistedRoute, setPersistedRoute] = useState<string | undefined>();
    const [hasBootstrappedRoute, setHasBootstrappedRoute] = useState(false);
    const [activeBar, setActiveBar] = useState<BarKey | undefined>(undefined);
    const [hasInitializedBar, setHasInitializedBar] = useState(false);

    const showBars = activeBar !== undefined;

    // Playback expiry: if no track for a while, hide the playback bar.
    useEffect(() => {
        let timer: number | undefined;

        if (hasTrack) {
            setPlaybackExpired(false);
        } else if (!playbackExpired) {
            timer = window.setTimeout(() => {
                setPlaybackExpired(true);
            }, PLAYBACK_STALE_MS);
        }

        return () => {
            if (timer) window.clearTimeout(timer);
        };
    }, [hasTrack, playbackExpired]);

    // Layout derivation
    const routeRule = ROUTE_RULES[pathname];

    const widthOverride = routeRule?.widthOverride;
    const heightOverride = routeRule?.heightOverride;

    const width = widthOverride !== undefined ? widthOverride : baseWidth;
    const height = heightOverride !== undefined ? heightOverride : baseHeight;
    const playbackAvailable = !playbackExpired;

    useEffect(() => {
        if (!playbackAvailable && activeBar === 'playback') {
            setActiveBar('home');
        }
    }, [playbackAvailable, activeBar]);

    // Persisted app state
    useEffect(() => {
        void getFromStorage<PersistedAppState>(APP_STATE_KEY).then(
            (saved) => {
                if (typeof saved?.width === 'number') setBaseWidth(saved.width);
                if (typeof saved?.height === 'number')
                    setBaseHeight(saved.height);
                if (typeof saved?.playbackExpanded === 'boolean')
                    setPlaybackExpanded(saved.playbackExpanded);
                if (saved?.lastRoute) setPersistedRoute(saved.lastRoute);
            }
        );
    }, []);

    const persistAppState = useCallback(
        (next: Partial<PersistedAppState>) => {
            const merged: PersistedAppState = {
                width: baseWidth,
                height: baseHeight,
                playbackExpanded,
                lastRoute: persistedRoute,
                ...next,
            };
            void setInStorage(APP_STATE_KEY, merged);
        },
        [baseWidth, baseHeight, playbackExpanded, persistedRoute]
    );

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

    // Initial active bar: only decide once when app is loading.
    useEffect(() => {
        if (hasInitializedBar || authed === undefined) return;
        const initialBar: BarKey | undefined =
            authed === false
                ? undefined
                : isPlaying
                ? 'playback'
                : 'home';
        setActiveBar(initialBar);
        setHasInitializedBar(true);
    }, [hasInitializedBar, authed, isPlaying]);

    // Restore previously active route when the popup is reopened, once activeBar exists.
    useEffect(() => {
        if (hasBootstrappedRoute || !activeBar) return;

        const fallbackRoute = BAR_RULES[activeBar].defaultRoute;
        const candidate = persistedRoute ?? fallbackRoute;

        const allowedBars = ROUTE_RULES[candidate]?.allowedBars;
        const target =
            allowedBars && !allowedBars.includes(activeBar)
                ? fallbackRoute
                : candidate;

        if (pathname !== target) {
            navigate(target, { replace: true });
        }

        setHasBootstrappedRoute(true);
    }, [activeBar, hasBootstrappedRoute, navigate, pathname, persistedRoute]);

    // Persist the latest route so the next popup session can restore it.
    useEffect(() => {
        if (!hasBootstrappedRoute) return;
        const toPersist = pathname || ROUTES.root;
        setPersistedRoute(toPersist);
        persistAppState({ lastRoute: toPersist });
    }, [pathname, hasBootstrappedRoute, persistAppState]);

    useEffect(() => {
        if (!activeBar) return;
        const allowedBars = ROUTE_RULES[pathname]?.allowedBars;
        const fallback = BAR_RULES[activeBar].defaultRoute;
        if (allowedBars && !allowedBars.includes(activeBar)) {
            if (pathname !== fallback) {
                navigate(fallback, { replace: true });
            }
        }
    }, [pathname, activeBar, navigate]);

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
            persistAppState({ width: value });
        }, [persistAppState]),
        setHeight: useCallback((value: number) => {
            setBaseHeight(value);
            persistAppState({ height: value });
        }, [persistAppState]),
        setPlaybackExpanded: useCallback((value: boolean) => {
            setPlaybackExpanded(value);
            persistAppState({ playbackExpanded: value });
        }, [persistAppState]),
        setActiveBar,

        toggleProfile,

        playbackExpanded,
        playbackAvailable,
    };*/
}
