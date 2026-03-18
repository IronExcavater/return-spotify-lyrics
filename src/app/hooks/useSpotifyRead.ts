import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    clearSpotifyReads,
    readSpotify,
    readSpotifySnapshot,
    sameSpotifyReadSnapshot,
    subscribeToSpotifyReadStore,
    type SpotifyReadConfig,
    type SpotifyReadSnapshot,
} from '../data/spotifyReadStore';

type HookConfig<T> = SpotifyReadConfig<T> & {
    enabled?: boolean;
    refreshOnFocus?: boolean;
    getNextRefreshMs?: (snapshot: SpotifyReadSnapshot<T>) => number | null;
};

const DEFAULT_STALE_MS = 60_000;
const DEFAULT_CACHE_MS = 10 * 60 * 1000;

export function useSpotifyRead<T>({
    key,
    load,
    staleMs = DEFAULT_STALE_MS,
    cacheMs = DEFAULT_CACHE_MS,
    enabled = true,
    refreshOnFocus = false,
    getNextRefreshMs,
}: HookConfig<T>) {
    const configRef = useRef({
        key,
        load,
        staleMs,
        cacheMs,
    });
    const [snapshot, setSnapshot] = useState<SpotifyReadSnapshot<T>>(() =>
        readSpotifySnapshot<T>(key, staleMs)
    );

    configRef.current = {
        key,
        load,
        staleMs,
        cacheMs,
    };

    useEffect(() => {
        setSnapshot((previous) => {
            const next = readSpotifySnapshot<T>(key, staleMs);
            return sameSpotifyReadSnapshot(previous, next) ? previous : next;
        });
    }, [key, staleMs]);

    useEffect(() => {
        return subscribeToSpotifyReadStore(key, () => {
            setSnapshot((previous) => {
                const next = readSpotifySnapshot<T>(key, staleMs);
                return sameSpotifyReadSnapshot(previous, next)
                    ? previous
                    : next;
            });
        });
    }, [key, staleMs]);

    const refresh = useCallback(
        async (force = false) =>
            readSpotify({
                ...configRef.current,
                force,
            }),
        []
    );

    useEffect(() => {
        if (!enabled) return;
        void readSpotify(configRef.current).catch(() => undefined);
    }, [cacheMs, enabled, key, staleMs]);

    const nextRefreshMs = useMemo(
        () => (enabled ? (getNextRefreshMs?.(snapshot) ?? null) : null),
        [enabled, getNextRefreshMs, snapshot]
    );

    useEffect(() => {
        if (!enabled || nextRefreshMs == null || snapshot.retryAt) return;

        const timeout = setTimeout(
            () => {
                void refresh(true).catch(() => undefined);
            },
            Math.max(250, nextRefreshMs)
        );

        return () => clearTimeout(timeout);
    }, [enabled, nextRefreshMs, refresh, snapshot.retryAt]);

    useEffect(() => {
        if (!enabled || !refreshOnFocus) return;

        const handleFocus = () => {
            if (document.visibilityState !== 'visible') return;
            void refresh().catch(() => undefined);
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleFocus);
        };
    }, [enabled, refresh, refreshOnFocus]);

    return {
        ...snapshot,
        refresh,
    };
}

export { clearSpotifyReads, readSpotify };
export type { SpotifyReadSnapshot };
