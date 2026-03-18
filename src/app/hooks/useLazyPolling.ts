import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

type UseLazyPollingOptions<T> = {
    load: () => Promise<T>;
    enabled?: boolean;
    intervalMs?: number;
    initialData?: T | null;
    merge?: (prev: T, next: T) => T;
    equals?: (prev: T, next: T) => boolean;
    onError?: (error: unknown) => void;
};

type UseLazyPollingResult<T> = {
    data: T | null;
    loading: boolean;
    refreshing: boolean;
    error: unknown;
    refresh: () => Promise<void>;
    setData: Dispatch<SetStateAction<T | null>>;
};

export function useLazyPolling<T>({
    load,
    enabled = true,
    intervalMs,
    initialData = null,
    merge,
    equals,
    onError,
}: UseLazyPollingOptions<T>): UseLazyPollingResult<T> {
    const [data, setData] = useState<T | null>(initialData);
    const [loading, setLoading] = useState(enabled && initialData == null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const loadRef = useRef(load);
    const mergeRef = useRef(merge);
    const equalsRef = useRef(equals);
    const onErrorRef = useRef(onError);
    const dataRef = useRef<T | null>(null);
    const inFlightRef = useRef(false);

    useEffect(() => {
        loadRef.current = load;
    }, [load]);
    useEffect(() => {
        mergeRef.current = merge;
    }, [merge]);
    useEffect(() => {
        equalsRef.current = equals;
    }, [equals]);
    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const refresh = useCallback(async () => {
        if (!enabled || inFlightRef.current) return;
        inFlightRef.current = true;
        if (dataRef.current == null) setLoading(true);
        else setRefreshing(true);

        try {
            const next = await loadRef.current();
            setData((prev) => {
                const merged =
                    prev != null && mergeRef.current
                        ? mergeRef.current(prev, next)
                        : next;
                if (prev != null && equalsRef.current?.(prev, merged)) {
                    return prev;
                }
                return merged;
            });
            setError(null);
        } catch (nextError) {
            setError(nextError);
            onErrorRef.current?.(nextError);
        } finally {
            inFlightRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        void refresh();

        if (!intervalMs || intervalMs <= 0) return;
        const timer = window.setInterval(() => {
            void refresh();
        }, intervalMs);
        return () => window.clearInterval(timer);
    }, [enabled, intervalMs, refresh]);

    return {
        data,
        loading,
        refreshing,
        error,
        refresh,
        setData,
    };
}
