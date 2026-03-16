import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ReadStatus = 'idle' | 'loading' | 'success' | 'error';

type ReadEntry<T = unknown> = {
    data?: T;
    error?: Error;
    fetchedAt?: number;
    cacheMs?: number;
    promise?: Promise<T>;
    retryAt?: number;
    retryTimer?: ReturnType<typeof setTimeout>;
    listeners: Set<() => void>;
};

export type SpotifyReadSnapshot<T> = {
    status: ReadStatus;
    data?: T;
    error?: Error;
    fetchedAt?: number;
    isFetching: boolean;
    isStale: boolean;
    retryAt?: number;
};

type ReadConfig<T> = {
    key: string;
    load: () => Promise<T>;
    staleMs?: number;
    cacheMs?: number;
};

type HookConfig<T> = ReadConfig<T> & {
    enabled?: boolean;
    refreshOnFocus?: boolean;
    getNextRefreshMs?: (snapshot: SpotifyReadSnapshot<T>) => number | null;
};

const DEFAULT_STALE_MS = 60_000;
const DEFAULT_CACHE_MS = 10 * 60 * 1000;
const DEFAULT_RETRY_MS = 30_000;

const reads = new Map<string, ReadEntry<unknown>>();

const toError = (error: unknown) =>
    error instanceof Error ? error : new Error(String(error));

const isRateLimitError = (error: unknown) => {
    const message = toError(error).message.toLowerCase();
    return message.includes('429') || message.includes('rate limit');
};

const getRetryDelayMs = (error: unknown) => {
    const message = toError(error).message;
    const match = /retry[- ]after[^0-9]*(\d+)/i.exec(message);
    if (!match) return DEFAULT_RETRY_MS;
    return Math.max(1_000, Number(match[1]) * 1_000);
};

const getEntry = <T>(key: string) => {
    const existing = reads.get(key) as ReadEntry<T> | undefined;
    if (existing) return existing;

    const entry: ReadEntry<T> = {
        listeners: new Set(),
    };

    reads.set(key, entry as ReadEntry<unknown>);
    return entry;
};

const isFresh = (entry: ReadEntry, staleMs: number) =>
    Boolean(entry.fetchedAt && Date.now() - entry.fetchedAt < staleMs);

const isFetching = (entry?: ReadEntry) => Boolean(entry?.promise);

const getSnapshot = <T>(
    key: string,
    staleMs = DEFAULT_STALE_MS
): SpotifyReadSnapshot<T> => {
    const entry = reads.get(key) as ReadEntry<T> | undefined;
    if (!entry) {
        return {
            status: 'idle',
            isFetching: false,
            isStale: false,
        };
    }

    const hasData = entry.data !== undefined;
    const status: ReadStatus =
        entry.error && !hasData
            ? 'error'
            : hasData
              ? 'success'
              : isFetching(entry)
                ? 'loading'
                : 'idle';

    return {
        status,
        data: entry.data,
        error: entry.error,
        fetchedAt: entry.fetchedAt,
        isFetching: isFetching(entry),
        isStale: entry.data !== undefined && !isFresh(entry, staleMs),
        retryAt: entry.retryAt,
    };
};

const sameSnapshot = <T>(
    left: SpotifyReadSnapshot<T>,
    right: SpotifyReadSnapshot<T>
) =>
    left.status === right.status &&
    left.data === right.data &&
    left.error === right.error &&
    left.fetchedAt === right.fetchedAt &&
    left.isFetching === right.isFetching &&
    left.isStale === right.isStale &&
    left.retryAt === right.retryAt;

const notify = (key: string) => {
    const entry = reads.get(key);
    entry?.listeners.forEach((listener) => listener());
};

const cleanup = (key: string, cacheMs: number) => {
    const entry = reads.get(key);
    if (!entry || entry.listeners.size > 0 || entry.promise) return;
    if (!entry.fetchedAt || Date.now() - entry.fetchedAt > cacheMs) {
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        reads.delete(key);
    }
};

const scheduleRetry = <T>(key: string, config: ReadConfig<T>) => {
    const entry = getEntry<T>(key);
    if (!entry.retryAt || entry.retryAt <= Date.now()) {
        return;
    }

    if (entry.retryTimer) clearTimeout(entry.retryTimer);

    entry.retryTimer = setTimeout(
        () => {
            entry.retryTimer = undefined;
            void readSpotify({
                ...config,
                force: true,
            }).catch(() => undefined);
        },
        Math.max(250, entry.retryAt - Date.now())
    );
};

export async function readSpotify<T>({
    key,
    load,
    staleMs = DEFAULT_STALE_MS,
    cacheMs = DEFAULT_CACHE_MS,
    force = false,
}: ReadConfig<T> & { force?: boolean }) {
    const entry = getEntry<T>(key);
    entry.cacheMs = cacheMs;

    if (!force && entry.promise) {
        return entry.promise;
    }

    if (!force && entry.data !== undefined && isFresh(entry, staleMs)) {
        return entry.data;
    }

    if (!force && entry.retryAt && entry.retryAt > Date.now()) {
        scheduleRetry(key, { key, load, staleMs, cacheMs });
        if (entry.data !== undefined) {
            return entry.data;
        }
        throw new Error('Spotify is rate limiting requests. Retrying shortly.');
    }

    if (entry.retryTimer) {
        clearTimeout(entry.retryTimer);
        entry.retryTimer = undefined;
    }

    const promise = Promise.resolve()
        .then(load)
        .then((data) => {
            entry.data = data;
            entry.error = undefined;
            entry.fetchedAt = Date.now();
            entry.retryAt = undefined;
            return data;
        })
        .catch((error) => {
            const resolvedError = toError(error);

            if (isRateLimitError(resolvedError)) {
                entry.retryAt = Date.now() + getRetryDelayMs(resolvedError);
                scheduleRetry(key, { key, load, staleMs, cacheMs });
            }

            entry.error = resolvedError;
            if (entry.data !== undefined) {
                return entry.data;
            }
            throw resolvedError;
        })
        .finally(() => {
            entry.promise = undefined;
            notify(key);
            cleanup(key, cacheMs);
        });

    entry.error = undefined;
    entry.retryAt = undefined;
    entry.promise = promise;
    notify(key);
    return promise;
}

const subscribe = (key: string, listener: () => void) => {
    const entry = getEntry(key);
    entry.listeners.add(listener);

    return () => {
        entry.listeners.delete(listener);
        cleanup(key, entry.cacheMs ?? DEFAULT_CACHE_MS);
    };
};

export const clearSpotifyReads = () => {
    const listeners = new Set<() => void>();

    reads.forEach((entry) => {
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        entry.listeners.forEach((listener) => listeners.add(listener));
    });
    reads.clear();
    listeners.forEach((listener) => listener());
};

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
        getSnapshot<T>(key, staleMs)
    );

    configRef.current = {
        key,
        load,
        staleMs,
        cacheMs,
    };

    useEffect(() => {
        setSnapshot((previous) => {
            const next = getSnapshot<T>(key, staleMs);
            return sameSnapshot(previous, next) ? previous : next;
        });
    }, [key, staleMs]);

    useEffect(() => {
        return subscribe(key, () => {
            setSnapshot((previous) => {
                const next = getSnapshot<T>(key, staleMs);
                return sameSnapshot(previous, next) ? previous : next;
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
