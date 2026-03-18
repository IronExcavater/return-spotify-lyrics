import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import { getFromStorage, setInStorage } from '../../shared/storage';
import appStateConfigJson from '../config/app-state.json';
import type { Surface } from '../surface';

export type BarKey = 'home' | 'playback';

export const ROUTES = {
    root: '/',
    home: '/home',
    media: '/media',
    playlist: '/playlist',
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

type AppStateConfig = {
    barRulesBySurface: Record<Surface, Record<BarKey, BarRule>>;
    routeRulesBySurface: Record<
        Surface,
        Partial<Record<RouteValue, RouteRule>>
    >;
};

const APP_STATE_CONFIG = appStateConfigJson as AppStateConfig;
const ROUTE_VALUES = Object.values(ROUTES) as RouteValue[];

export const SECONDARY_ROUTES = Object.entries(
    APP_STATE_CONFIG.routeRulesBySurface.popup
)
    .filter(([, rule]) => rule?.secondary)
    .map(([route]) => route as RouteValue);

export const isSecondaryRoute = (route: string) =>
    SECONDARY_ROUTES.includes(route as RouteValue);

const getBarRules = (surface: Surface): Record<BarKey, BarRule> =>
    APP_STATE_CONFIG.barRulesBySurface[surface];

const getRouteRules = (
    surface: Surface
): Partial<Record<RouteValue, RouteRule>> =>
    APP_STATE_CONFIG.routeRulesBySurface[surface];

const getAppStateKey = (surface: Surface) => `appState:${surface}`;

const isBarKey = (value: unknown): value is BarKey =>
    value === 'home' || value === 'playback';

const toBarKey = (value: unknown): BarKey => (isBarKey(value) ? value : 'home');

const toRouteValue = (value: string): RouteValue | null =>
    ROUTE_VALUES.includes(value as RouteValue) ? (value as RouteValue) : null;

type AppState = {
    width?: number;
    height?: number;
    playbackExpanded?: boolean;
    lastBar?: BarKey;
    lastRouteByBar?: Partial<Record<BarKey, RouteValue>>;
};

function isRouteAllowed(
    route: RouteValue,
    bar: BarKey,
    rules: Partial<Record<RouteValue, RouteRule>>
) {
    const rule = rules[route];
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

    if (preferredRoute && isRouteAllowed(preferredRoute, bar, routeRules)) {
        return preferredRoute;
    }
    if (isRouteAllowed(defaultRoute, bar, routeRules)) {
        return defaultRoute;
    }

    const firstAllowed = ROUTE_VALUES.find((route) =>
        routeRules[route]?.allowedBars?.includes(bar)
    );
    if (firstAllowed) return firstAllowed;

    return bar === 'playback' ? ROUTES.lyrics : ROUTES.home;
}

interface Props {
    fallbackWidth: number;
    fallbackHeight: number;
    surface?: Surface;
    showBars?: boolean;
    hasPlayback?: boolean;
    playbackKnown?: boolean;
}

export function useAppState({
    fallbackWidth,
    fallbackHeight,
    surface = 'popup',
    showBars = true,
    hasPlayback = true,
    playbackKnown = true,
}: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const currentRoute = useMemo(
        () => toRouteValue(location.pathname),
        [location.pathname]
    );
    const barRules = useMemo(() => getBarRules(surface), [surface]);
    const routeRules = useMemo(() => getRouteRules(surface), [surface]);
    const appStateKey = useMemo(() => getAppStateKey(surface), [surface]);
    const trackApp = useMemo(() => createAnalyticsTracker('app'), []);

    const [hydrated, setHydrated] = useState(false);
    const [appState, setAppState] = useState<AppState>({});
    const [activeBar, setActiveBarState] = useState<BarKey>('home');

    const previousBarRef = useRef<BarKey | null>(null);
    const currentRouteRef = useRef<RouteValue | null>(currentRoute);
    const navigateRef = useRef(navigate);
    const openedRef = useRef(false);

    useEffect(() => {
        currentRouteRef.current = currentRoute;
    }, [currentRoute]);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    const updateAppState = useCallback(
        (updater: (prev: AppState) => AppState) => {
            setAppState((prev) => {
                const next = updater(prev);
                return Object.is(next, prev) ? prev : next;
            });
        },
        []
    );

    const patchAppState = useCallback(
        (patch: Partial<AppState>) => {
            updateAppState((prev) => {
                const entries = Object.entries(patch) as Array<
                    [keyof AppState, AppState[keyof AppState]]
                >;
                const changed = entries.some(
                    ([key, value]) => prev[key] !== value
                );
                if (!changed) return prev;
                return { ...prev, ...patch };
            });
        },
        [updateAppState]
    );

    const updateLastRouteForBar = useCallback(
        (bar: BarKey, route: RouteValue) => {
            updateAppState((prev) => {
                const routeMap = prev.lastRouteByBar ?? {};
                if (routeMap[bar] === route) return prev;
                return {
                    ...prev,
                    lastRouteByBar: {
                        ...routeMap,
                        [bar]: route,
                    },
                };
            });
        },
        [updateAppState]
    );

    const routeForBar = useCallback(
        (bar: BarKey, routeMap?: Partial<Record<BarKey, RouteValue>>) =>
            resolveAllowedRoute(bar, routeMap?.[bar], barRules, routeRules),
        [barRules, routeRules]
    );

    // Hydrate per-surface app state.
    useEffect(() => {
        setHydrated(false);
        previousBarRef.current = null;
        openedRef.current = false;

        let cancelled = false;
        void getFromStorage<AppState>(appStateKey, (saved) => {
            if (cancelled) return;

            const persisted = saved ?? {};
            const initialBar = toBarKey(persisted.lastBar);
            const initialRoute = routeForBar(
                initialBar,
                persisted.lastRouteByBar
            );

            setAppState(persisted);
            setActiveBarState(initialBar);
            previousBarRef.current = initialBar;

            if (currentRouteRef.current !== initialRoute) {
                navigateRef.current(initialRoute, { replace: true });
            }
            setHydrated(true);
        });

        return () => {
            cancelled = true;
        };
    }, [appStateKey, routeForBar]);

    // Persist app state once hydrated.
    useEffect(() => {
        if (!hydrated) return;
        void setInStorage(appStateKey, appState);
    }, [appState, appStateKey, hydrated]);

    // Persist and track active bar.
    useEffect(() => {
        if (!hydrated) return;
        patchAppState({ lastBar: activeBar });
    }, [activeBar, hydrated, patchAppState]);

    useEffect(() => {
        if (!hydrated) return;
        void trackApp(ANALYTICS_EVENTS.appBarChange, {
            reason: 'bar switched',
            data: { bar: activeBar },
        });
    }, [activeBar, hydrated, trackApp]);

    // Track route analytics.
    useEffect(() => {
        if (!hydrated) return;
        void trackApp(ANALYTICS_EVENTS.appRoute, {
            reason: 'navigation',
            data: { to: location.pathname },
        });
    }, [hydrated, location.pathname, trackApp]);

    // Track and persist current route per active bar.
    useEffect(() => {
        if (!hydrated) return;
        if (!currentRoute) return;
        if (!isRouteAllowed(currentRoute, activeBar, routeRules)) return;
        updateLastRouteForBar(activeBar, currentRoute);
    }, [activeBar, currentRoute, hydrated, routeRules, updateLastRouteForBar]);

    // Force playback bar back to home when playback is known to be unavailable.
    useEffect(() => {
        if (!hydrated || !showBars) return;
        if (activeBar !== 'playback') return;
        if (!playbackKnown || hasPlayback) return;
        setActiveBarState('home');
    }, [activeBar, hasPlayback, hydrated, playbackKnown, showBars]);

    // Only restore a bar-specific route when the current route is not allowed
    // in the newly active bar.
    useEffect(() => {
        if (!hydrated) return;

        const nextRoute = routeForBar(activeBar, appState.lastRouteByBar);
        const routeAllowed =
            currentRoute != null &&
            isRouteAllowed(currentRoute, activeBar, routeRules);

        previousBarRef.current = activeBar;

        if (!routeAllowed && currentRoute !== nextRoute) {
            navigate(nextRoute, { replace: true });
        }
    }, [
        activeBar,
        appState.lastRouteByBar,
        currentRoute,
        hydrated,
        navigate,
        routeForBar,
        routeRules,
    ]);

    // One-time open tracking after hydration.
    useEffect(() => {
        if (!hydrated || openedRef.current) return;
        openedRef.current = true;
        void trackApp(ANALYTICS_EVENTS.appOpen, {
            reason: 'popup initialised',
        });
    }, [hydrated, trackApp]);

    const routeRule = currentRoute
        ? (routeRules[currentRoute] as RouteRule | undefined)
        : undefined;
    const widthOverride = routeRule?.widthOverride;
    const heightOverride = routeRule?.heightOverride;
    const width = widthOverride ?? appState.width ?? fallbackWidth;
    const height = heightOverride ?? appState.height ?? fallbackHeight;

    const setWidth = useCallback(
        (nextWidth: number) => patchAppState({ width: nextWidth }),
        [patchAppState]
    );

    const setHeight = useCallback(
        (nextHeight: number) => patchAppState({ height: nextHeight }),
        [patchAppState]
    );

    const setPlaybackExpanded = useCallback(
        (expanded: boolean) => {
            void trackApp(ANALYTICS_EVENTS.playbackExpand, {
                reason: expanded
                    ? 'playback bar expanded'
                    : 'playback bar collapsed',
                data: { expanded },
            });
            patchAppState({ playbackExpanded: expanded });
        },
        [patchAppState, trackApp]
    );

    const setActiveBar = useCallback((nextBar: BarKey) => {
        setActiveBarState((prevBar) =>
            prevBar === nextBar ? prevBar : nextBar
        );
    }, []);

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
