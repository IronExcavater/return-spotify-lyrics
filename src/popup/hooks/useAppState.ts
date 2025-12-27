import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFromStorage, setInStorage } from '../../shared/storage';
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
        allowedBars: ['playback'],
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
    [ROUTES.profile]: {
        heightOverride: 'auto',
    },
    [ROUTES.media]: {
        allowedBars: ['home'],
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

interface Props {
    fallbackWidth: number;
    fallbackHeight: number;
}

export function useAppState({ fallbackWidth, fallbackHeight }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const { authed } = useAuth();
    const { playback } = usePlayer();

    const [hydrated, setHydrated] = useState(false);
    const [appState, setAppState] = useState<AppState>({});
    const [activeBar, setActiveBar] = useState<BarKey>('home');

    const routeRule = ROUTE_RULES[location.pathname] as RouteRule;

    // load app state
    useEffect(() => {
        getFromStorage<AppState>(APP_STATE_KEY, (saved) => {
            const nextState: AppState = saved ?? {};
            setAppState(nextState);

            const initialBar = nextState.lastBar ?? 'home';
            setActiveBar(initialBar);
            navigate(nextState.lastRoute ?? BAR_RULES[initialBar].defaultRoute);
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

        // If we have no prior bar saved and playback exists, prefer playback
        if (!appState.lastBar && playback) {
            setActiveBar('playback');
            void updateAppState({ lastBar: 'playback' });
        }
    }, [hydrated, playback, appState.lastBar, initialised, updateAppState]);

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

    // Enforce route rules without causing oscillation
    const lastEnforcedNav = useRef<{ bar: BarKey; route: RouteValue } | null>(
        null
    );

    useEffect(() => {
        if (!hydrated) return;

        const path = location.pathname as RouteValue;
        const last = lastEnforcedNav.current;

        // If we already enforced this combo, do nothing
        if (last?.bar === activeBar && last.route === path) return;

        if (!isRouteAllowed(path, activeBar)) {
            const fallback = BAR_RULES[activeBar].defaultRoute;
            if (path !== fallback) {
                navigate(fallback, { replace: true });
                lastEnforcedNav.current = { bar: activeBar, route: fallback };
                return;
            }
        }

        lastEnforcedNav.current = { bar: activeBar, route: path };
    }, [hydrated, activeBar, location.pathname, navigate]);

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
}
