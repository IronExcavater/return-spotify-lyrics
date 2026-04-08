import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type SetStateAction,
} from 'react';
import {
    clearSpotifyReads,
    readSpotify,
    readSpotifySnapshot,
    sameSpotifyReadSnapshot,
    subscribeToSpotifyReadStore,
    updateSpotifyReadData,
    writeSpotifyReadData,
    type SpotifyReadConfig,
    type SpotifyReadSnapshot,
} from '../data/spotifyReadStore';

type HookConfig<T> = SpotifyReadConfig<T> & {
    enabled?: boolean;
    initialData?: T | null;
    onError?: (error: unknown) => void;
    pollMs?: number;
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
    initialData = null,
    onError,
    pollMs,
    refreshOnFocus = false,
    getNextRefreshMs,
}: HookConfig<T>) {
    const configRef = useRef({
        key,
        load,
        staleMs,
        cacheMs,
    });
    const onErrorRef = useRef(onError);
    const [snapshot, setSnapshot] = useState<SpotifyReadSnapshot<T>>(() =>
        readSpotifySnapshot<T>(key, staleMs)
    );

    configRef.current = {
        key,
        load,
        staleMs,
        cacheMs,
    };
    onErrorRef.current = onError;

    useEffect(() => {
        if (initialData == null) return;
        if (readSpotifySnapshot<T>(key, staleMs).data !== undefined) return;

        writeSpotifyReadData(key, initialData, { cacheMs });
    }, [cacheMs, initialData, key, staleMs]);

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
        async (force = false) => {
            try {
                return await readSpotify({
                    ...configRef.current,
                    force,
                });
            } catch (error) {
                onErrorRef.current?.(error);
                throw error;
            }
        },
        []
    );

    useEffect(() => {
        if (!enabled) return;
        void readSpotify(configRef.current).catch(() => undefined);
    }, [cacheMs, enabled, key, staleMs]);

    const nextRefreshMs = useMemo(() => {
        if (!enabled) return null;
        if (pollMs != null) return pollMs;

        return getNextRefreshMs?.(snapshot) ?? null;
    }, [enabled, getNextRefreshMs, pollMs, snapshot]);

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

    const setData = useCallback(
        (value: SetStateAction<T | null>) => {
            updateSpotifyReadData<T>(
                key,
                (previous) => {
                    const current = previous ?? initialData ?? undefined;
                    const next =
                        typeof value === 'function'
                            ? (
                                  value as (
                                      previous: T | null
                                  ) => T | null
                              )(current ?? null)
                            : value;

                    return next ?? undefined;
                },
                { cacheMs }
            );
        },
        [cacheMs, initialData, key]
    );

    const data = snapshot.data ?? initialData ?? null;
    const loading =
        data == null &&
        (snapshot.status === 'idle' || snapshot.status === 'loading');
    const refreshing = data != null && snapshot.isFetching;

    return {
        data,
        loading,
        refreshing,
        ...snapshot,
        refresh,
        setData,
    };
}

export { clearSpotifyReads, readSpotify };
export type { SpotifyReadSnapshot };
