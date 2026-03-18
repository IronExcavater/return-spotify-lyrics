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

export type SpotifyReadConfig<T> = {
    key: string;
    load: () => Promise<T>;
    staleMs?: number;
    cacheMs?: number;
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

const clearRetryTimer = (entry: ReadEntry) => {
    if (!entry.retryTimer) return;
    clearTimeout(entry.retryTimer);
    entry.retryTimer = undefined;
};

export const readSpotifySnapshot = <T>(
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

export const sameSpotifyReadSnapshot = <T>(
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

const notifySpotifyReadListeners = (key: string) => {
    const entry = reads.get(key);
    entry?.listeners.forEach((listener) => listener());
};

const cleanup = (key: string, cacheMs: number) => {
    const entry = reads.get(key);
    if (!entry || entry.listeners.size > 0 || entry.promise) return;
    if (!entry.fetchedAt || Date.now() - entry.fetchedAt > cacheMs) {
        clearRetryTimer(entry);
        reads.delete(key);
    }
};

const scheduleRetry = <T>(key: string, config: SpotifyReadConfig<T>) => {
    const entry = getEntry<T>(key);
    if (!entry.retryAt || entry.retryAt <= Date.now()) return;

    clearRetryTimer(entry);

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
}: SpotifyReadConfig<T> & { force?: boolean }) {
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

    clearRetryTimer(entry);

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
            notifySpotifyReadListeners(key);
            cleanup(key, cacheMs);
        });

    entry.error = undefined;
    entry.retryAt = undefined;
    entry.promise = promise;
    notifySpotifyReadListeners(key);
    return promise;
}

export const subscribeToSpotifyReadStore = (
    key: string,
    listener: () => void
) => {
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
        clearRetryTimer(entry);
        entry.listeners.forEach((listener) => listeners.add(listener));
    });
    reads.clear();
    listeners.forEach((listener) => listener());
};
