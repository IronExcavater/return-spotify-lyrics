import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ANALYTICS_EVENTS,
    createAnalyticsTracker,
} from '../../shared/analytics';
import { getFromStorage, setInStorage } from '../../shared/storage';
import appStateConfigJson from '../config/app-state.json';
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

const toRouteValue = (value: string): RouteValue =>
    ROUTE_VALUES.includes(value as RouteValue)
        ? (value as RouteValue)
        : ROUTES.root;

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
    const currentRoute = useMemo(
        () => toRouteValue(location.pathname),
        [location.pathname]
    );
    const barRules = useMemo(() => getBarRules(surface), [surface]);
    const routeRules = useMemo(() => getRouteRules(surface), [surface]);
    const appStateKey = useMemo(() => getAppStateKey(surface), [surface]);

    const { authed } = useAuth();
    const { playback } = usePlayer();
    const trackApp = useMemo(() => createAnalyticsTracker('app'), []);

    const [hydrated, setHydrated] = useState(false);
    const [appState, setAppState] = useState<AppState>({});
    const [activeBar, setActiveBar] = useState<BarKey>('home');

    const hydrationKeyRef = useRef<string | null>(null);
    const openedRef = useRef(false);
    const initialisedRef = useRef(false);
    const previousBarRef = useRef<BarKey | null>(null);
    const lastTrackedBarRef = useRef<BarKey | null>(null);
    const lastTrackedRouteRef = useRef<RouteValue | null>(null);

    const routeRule = routeRules[currentRoute] as RouteRule | undefined;

    const patchAppState = useCallback((patch: Partial<AppState>) => {
        setAppState((prev) => {
            const entries = Object.entries(patch) as Array<
                [keyof AppState, AppState[keyof AppState]]
            >;
            const changed = entries.some(([key, value]) => prev[key] !== value);
            return changed ? { ...prev, ...patch } : prev;
        });
    }, []);

    const updateLastRouteForBar = useCallback(
        (bar: BarKey, route: RouteValue) => {
            setAppState((prev) => {
                const previousByBar = prev.lastRouteByBar ?? {};
                if (previousByBar[bar] === route) return prev;
                return {
                    ...prev,
                    lastRouteByBar: {
                        ...previousByBar,
                        [bar]: route,
                    },
                };
            });
        },
        []
    );

    // Persist app state once hydrated.
    useEffect(() => {
        if (!hydrated) return;
        void setInStorage(appStateKey, appState);
    }, [appState, appStateKey, hydrated]);

    // Hydrate per surface key.
    useEffect(() => {
        if (hydrationKeyRef.current === appStateKey) return;
        hydrationKeyRef.current = appStateKey;

        setHydrated(false);
        openedRef.current = false;
        initialisedRef.current = false;
        previousBarRef.current = null;
        lastTrackedBarRef.current = null;
        lastTrackedRouteRef.current = null;

        let cancelled = false;
        void getFromStorage<AppState>(appStateKey, (saved) => {
            if (cancelled) return;

            const persisted = saved ?? {};
            setAppState(persisted);

            const initialBar = toBarKey(persisted.lastBar);
            const initialRoute = resolveAllowedRoute(
                initialBar,
                persisted.lastRouteByBar?.[initialBar],
                barRules,
                routeRules
            );

            previousBarRef.current = initialBar;
            setActiveBar(initialBar);
            navigate(initialRoute, { replace: true });
            setHydrated(true);
        });

        return () => {
            cancelled = true;
        };
    }, [appStateKey, barRules, navigate, routeRules]);

    // Persist and track active bar.
    useEffect(() => {
        if (!hydrated) return;

        if (appState.lastBar !== activeBar) {
            patchAppState({ lastBar: activeBar });
        }
        if (lastTrackedBarRef.current === activeBar) return;
        lastTrackedBarRef.current = activeBar;

        void trackApp(ANALYTICS_EVENTS.appBarChange, {
            reason: 'bar switched',
            data: { bar: activeBar },
        });
    }, [activeBar, appState.lastBar, hydrated, patchAppState, trackApp]);

    // Restore bar-specific last route when switching bars.
    useEffect(() => {
        if (!hydrated) return;

        const barChanged =
            previousBarRef.current !== null &&
            previousBarRef.current !== activeBar;
        previousBarRef.current = activeBar;
        if (!barChanged) return;

        const targetRoute = resolveAllowedRoute(
            activeBar,
            appState.lastRouteByBar?.[activeBar],
            barRules,
            routeRules
        );
        if (targetRoute !== currentRoute) {
            navigate(targetRoute, { replace: true });
        }
    }, [
        activeBar,
        appState.lastRouteByBar,
        barRules,
        currentRoute,
        hydrated,
        navigate,
        routeRules,
    ]);

    // Keep route compliant with current bar rules.
    useEffect(() => {
        if (!hydrated) return;
        if (isRouteAllowed(currentRoute, activeBar, routeRules)) return;

        const fallbackRoute = resolveAllowedRoute(
            activeBar,
            appState.lastRouteByBar?.[activeBar],
            barRules,
            routeRules
        );
        if (fallbackRoute !== currentRoute) {
            navigate(fallbackRoute, { replace: true });
        }
    }, [
        activeBar,
        appState.lastRouteByBar,
        barRules,
        currentRoute,
        hydrated,
        navigate,
        routeRules,
    ]);

    // Track and persist current route per active bar.
    useEffect(() => {
        if (!hydrated) return;

        if (lastTrackedRouteRef.current !== currentRoute) {
            lastTrackedRouteRef.current = currentRoute;
            void trackApp(ANALYTICS_EVENTS.appRoute, {
                reason: 'navigation',
                data: { to: currentRoute },
            });
        }
        if (!isRouteAllowed(currentRoute, activeBar, routeRules)) return;
        updateLastRouteForBar(activeBar, currentRoute);
    }, [
        activeBar,
        currentRoute,
        hydrated,
        routeRules,
        trackApp,
        updateLastRouteForBar,
    ]);

    // Initial bar selection when playback exists.
    useEffect(() => {
        if (!hydrated || initialisedRef.current) return;
        initialisedRef.current = true;

        if (playback) {
            setActiveBar('playback');
            patchAppState({ lastBar: 'playback' });
        }
    }, [hydrated, patchAppState, playback]);

    // Fall back to home bar if playback is gone.
    useEffect(() => {
        if (!hydrated) return;
        if (activeBar !== 'playback' || playback !== null) return;

        setActiveBar('home');
        patchAppState({ lastBar: 'home' });
    }, [activeBar, hydrated, patchAppState, playback]);

    // One-time open tracking after hydration.
    useEffect(() => {
        if (!hydrated || openedRef.current) return;
        openedRef.current = true;
        void trackApp(ANALYTICS_EVENTS.appOpen, {
            reason: 'popup initialised',
        });
    }, [hydrated, trackApp]);

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
