import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import { getFromStorage, setInStorage } from '../../shared/storage';
import type { Surface } from '../surface';
import { useAuth } from './useAuth.ts';
import { usePlayer } from './usePlayer.ts';

export type BarKey = 'home' | 'playback';

export const ROUTES = {
    root: '/',
    home: '/home',
    media: '/media',
    login: '/login',
    lyrics: '/lyrics',
    profile: '/profile',
    queue: '/queue',
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
    secondary?: boolean;
};

const BASE_BAR_RULES: Record<BarKey, BarRule> = {
    home: {
        defaultRoute: ROUTES.root,
    },
    playback: {
        defaultRoute: ROUTES.lyrics,
    },
};

const BASE_ROUTE_RULES: Partial<Record<RouteValue, RouteRule>> = {
    [ROUTES.root]: {
        allowedBars: ['home'],
        heightOverride: 'auto',
    },
    [ROUTES.home]: {
        allowedBars: ['home'],
    },
    [ROUTES.lyrics]: {
        allowedBars: ['playback'],
        secondary: true,
    },
    [ROUTES.login]: {
        widthOverride: 300,
        heightOverride: 'auto',
    },
    [ROUTES.profile]: {
        heightOverride: 'auto',
        secondary: true,
    },
    [ROUTES.media]: {
        allowedBars: ['playback', 'home'],
    },
    [ROUTES.queue]: {
        allowedBars: ['playback', 'home'],
        secondary: true,
    },
};

export const SECONDARY_ROUTES = Object.entries(BASE_ROUTE_RULES)
    .filter(([, rule]) => rule?.secondary)
    .map(([route]) => route as RouteValue);

export const isSecondaryRoute = (route: string) =>
    SECONDARY_ROUTES.includes(route as RouteValue);

const getBarRules = (surface: Surface): Record<BarKey, BarRule> => {
    if (surface === 'sidepanel') {
        return {
            ...BASE_BAR_RULES,
            home: { defaultRoute: ROUTES.home },
            playback: { defaultRoute: ROUTES.lyrics },
        };
    }
    return BASE_BAR_RULES;
};

const getRouteRules = (
    surface: Surface
): Partial<Record<RouteValue, RouteRule>> => {
    if (surface !== 'sidepanel') return BASE_ROUTE_RULES;
    const entries = Object.entries(BASE_ROUTE_RULES).map(([route, rule]) => {
        if (!rule?.allowedBars) return [route, rule] as const;
        if (route === ROUTES.root) {
            return [
                route,
                {
                    ...rule,
                    allowedBars: [],
                },
            ] as const;
        }
        return [
            route,
            {
                ...rule,
                allowedBars: Array.from(
                    new Set<BarKey>([...rule.allowedBars, 'home'])
                ),
            },
        ] as const;
    });
    return Object.fromEntries(entries);
};

const getAppStateKey = (surface: Surface) => `appState:${surface}`;
const PLAYBACK_STALE_MS = 60_000;

type AppState = {
    width?: number;
    height?: number;
    playbackExpanded?: boolean;
    lastBar?: BarKey;
    lastRoute?: RouteValue;
};

function isRouteAllowed(
    pathname: RouteValue,
    bar: BarKey,
    rules: Partial<Record<RouteValue, RouteRule>>
) {
    const rule = rules[pathname];
    if (!rule?.allowedBars) return true;
    return rule.allowedBars.includes(bar);
}

function resolveAllowedRoute(
    bar: BarKey,
    preferredRoute: RouteValue | undefined,
    barRules: Record<BarKey, BarRule>,
    routeRules: Partial<Record<RouteValue, RouteRule>>
): RouteValue {
    const defaultRoute = barRules[bar].defaultRoute;
    if (preferredRoute && isRouteAllowed(preferredRoute, bar, routeRules))
        return preferredRoute;
    if (isRouteAllowed(defaultRoute, bar, routeRules)) return defaultRoute;

    const firstAllowed = (Object.values(ROUTES) as RouteValue[]).find((route) =>
        isRouteAllowed(route, bar, routeRules)
    );
    return firstAllowed ?? ROUTES.home;
}

interface Props {
    fallbackWidth: number;
    fallbackHeight: number;
    surface?: Surface;
}

export function useAppState({
    fallbackWidth,
    fallbackHeight,
    surface = 'popup',
}: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const barRules = useMemo(() => getBarRules(surface), [surface]);
    const routeRules = useMemo(() => getRouteRules(surface), [surface]);
    const appStateKey = useMemo(() => getAppStateKey(surface), [surface]);

    const { authed } = useAuth();
    const { playback } = usePlayer();
    const trackApp = useMemo(() => createAnalyticsTracker('app'), []);

    const [hydrated, setHydrated] = useState(false);
    const [appState, setAppState] = useState<AppState>({});
    const [activeBar, setActiveBar] = useState<BarKey>('home');
    const hydratedForKey = useRef<string | null>(null);

    const routeRule = routeRules[location.pathname] as RouteRule;

    // load app state
    useEffect(() => {
        if (hydratedForKey.current === appStateKey) return;
        hydratedForKey.current = appStateKey;

        void getFromStorage<AppState>(appStateKey, (saved) => {
            const nextState: AppState = saved ?? {};
            setAppState(nextState);

            const initialBar = nextState.lastBar ?? 'home';
            const initialRoute = resolveAllowedRoute(
                initialBar,
                nextState.lastRoute,
                barRules,
                routeRules
            );
            setActiveBar(initialBar);
            navigate(initialRoute, { replace: true });
            setHydrated(true);
        });
    }, [appStateKey, barRules, navigate, routeRules]);

    // Update app state
    const updateAppState = useCallback(
        async (patch: Partial<AppState>) => {
            setAppState((prev) => {
                const next = { ...prev, ...patch };
                void setInStorage(appStateKey, next);
                return next;
            });
        },
        [appStateKey]
    );

    // Update last bar to active bar
    useEffect(() => {
        if (!hydrated) return;

        void updateAppState({ lastBar: activeBar });
    }, [hydrated, activeBar, updateAppState]);

    const lastBarRef = useRef<BarKey | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        if (lastBarRef.current === activeBar) return;
        lastBarRef.current = activeBar;
        void trackApp(ANALYTICS_EVENTS.appBarChange, {
            reason: 'bar switched',
            data: { bar: activeBar },
        });
    }, [activeBar, hydrated, trackApp]);

    // Update last route to location.pathname
    useEffect(() => {
        if (!hydrated) return;
        const nextRoute = location.pathname as RouteValue;
        if (isSecondaryRoute(nextRoute)) return;
        void updateAppState({ lastRoute: nextRoute });
    }, [hydrated, location.pathname, updateAppState]);

    const lastRouteRef = useRef<RouteValue | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        const nextRoute = location.pathname as RouteValue;
        if (lastRouteRef.current === nextRoute) return;
        lastRouteRef.current = nextRoute;
        void trackApp(ANALYTICS_EVENTS.appRoute, {
            reason: 'navigation',
            data: { to: nextRoute },
        });
        if (!isSecondaryRoute(nextRoute)) {
            void updateAppState({ lastRoute: nextRoute });
        }
    }, [hydrated, location.pathname, trackApp]);

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

    const openedRef = useRef(false);

    useEffect(() => {
        if (!hydrated || openedRef.current) return;
        openedRef.current = true;
        void trackApp(ANALYTICS_EVENTS.appOpen, {
            reason: 'popup initialised',
        });
    }, [hydrated, trackApp]);

    // track last playback change
    const lastPlaybackChange = useRef<number | null>(null);

    useEffect(() => {
        if (!hydrated) return;

        if (playback) {
            lastPlaybackChange.current = null;
            return;
        }

        if (lastPlaybackChange.current === null)
            lastPlaybackChange.current = Date.now();
    }, [hydrated, playback]);

    // switch out of playback bar if playback unavailable
    useEffect(() => {
        if (!hydrated) return;

        if (activeBar === 'playback' && playback === null) {
            setActiveBar('home');
            void updateAppState({ lastBar: 'home' });
            return;
        }

        if (
            activeBar === 'playback' &&
            lastPlaybackChange.current !== null &&
            Date.now() >= lastPlaybackChange.current + PLAYBACK_STALE_MS
        ) {
            setActiveBar('home');
            void updateAppState({ lastBar: 'home' });
        }
    }, [hydrated, activeBar, playback, updateAppState]);

    // Enforce route rules
    const lastEnforcedNav = useRef<{ bar: BarKey; route: RouteValue } | null>(
        null
    );

    useEffect(() => {
        if (!hydrated) return;

        let path = location.pathname as RouteValue;

        const last = lastEnforcedNav.current;
        if (last?.bar === activeBar && last.route === path) return;

        if (!isRouteAllowed(path, activeBar, routeRules)) {
            const fallback = resolveAllowedRoute(
                activeBar,
                undefined,
                barRules,
                routeRules
            );

            if (path !== fallback) {
                navigate(fallback, { replace: true });
                path = fallback;
            }
        }

        lastEnforcedNav.current = { bar: activeBar, route: path };
    }, [
        hydrated,
        activeBar,
        location.pathname,
        navigate,
        playback,
        barRules,
        routeRules,
    ]);

    // App size getters
    const widthOverride = routeRule?.widthOverride;
    const heightOverride = routeRule?.heightOverride;

    const width = widthOverride ?? appState.width ?? fallbackWidth;
    const height = heightOverride ?? appState.height ?? fallbackHeight;

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
        (expanded: boolean) => {
            void trackApp(ANALYTICS_EVENTS.playbackExpand, {
                reason: expanded
                    ? 'playback bar expanded'
                    : 'playback bar collapsed',
                data: { expanded },
            });
            return updateAppState({ playbackExpanded: expanded });
        },
        [trackApp, updateAppState]
    );

    // Show bars getter (show while auth is loading)
    const showBars = authed !== false;

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
}
