import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type SetStateAction,
} from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

type StorageItem<T> = Pick<
    WxtStorageItem<T | null, Record<string, unknown>>,
    'getValue' | 'setValue' | 'watch'
>;

export default function useStorageState<T>(item: StorageItem<T>, fallback: T) {
    const [value, setValue] = useState(fallback);
    const current = useRef(value);
    const defaultValue = useRef(fallback);

    defaultValue.current = fallback;

    useEffect(() => {
        let cancelled = false;
        let changed = false;

        const unwatch = item.watch((next) => {
            changed = true;
            if (cancelled) return;

            current.current = next ?? defaultValue.current;
            setValue(current.current);
        });

        void item
            .getValue()
            .then((saved) => {
                if (cancelled || changed) return;

                current.current = saved ?? defaultValue.current;
                setValue(current.current);
            })
            .catch(console.error);

        return () => {
            cancelled = true;
            unwatch();
        };
    }, [item]);

    const update = useCallback(
        (action: SetStateAction<T>) => {
            const next =
                typeof action === 'function'
                    ? (action as (previous: T) => T)(current.current)
                    : action;

            current.current = next;
            setValue(next);
            void item.setValue(next).catch(console.error);
        },
        [item]
    );

    return [value, update] as const;
}
