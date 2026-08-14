import {
    useCallback,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type UsePortalOptions<Key extends string> = {
    slots: readonly Key[];
    active?: Key;
    defaultSlot: Key;
    children: ReactNode;
    enabled?: boolean;
    anchorClassName?: string;
};

export function usePortal<Key extends string>({
    slots,
    active,
    defaultSlot,
    children,
    enabled = true,
    anchorClassName = 'contents',
}: UsePortalOptions<Key>) {
    const id = useId();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const anchorsRef = useRef<Partial<Record<Key, HTMLDivElement | null>>>({});

    if (!hostRef.current && typeof document !== 'undefined') {
        hostRef.current = document.createElement('div');
        hostRef.current.className = 'contents';
    }

    const activeSlot = active ?? defaultSlot;

    const attach = useCallback(
        (key: Key) => (node: HTMLDivElement | null) => {
            anchorsRef.current[key] = node;
            const host = hostRef.current;
            if (!enabled || key !== activeSlot || !node || !host) return;
            if (host.parentElement !== node) node.appendChild(host);
        },
        [activeSlot, enabled]
    );

    useLayoutEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        if (!enabled) {
            host.remove();
            return;
        }

        const anchor = anchorsRef.current[activeSlot];
        if (anchor && host.parentElement !== anchor) anchor.appendChild(host);
    }, [activeSlot, enabled]);

    useLayoutEffect(() => () => hostRef.current?.remove(), []);

    const anchors = useMemo(
        () =>
            Object.fromEntries(
                slots.map((key) => [
                    key,
                    <div
                        key={`${id}-${key}`}
                        data-portal-slot={key}
                        className={anchorClassName}
                        ref={attach(key)}
                    />,
                ])
            ) as Record<Key, ReactNode>,
        [anchorClassName, attach, id, slots]
    );

    return {
        slots: anchors,
        content:
            enabled && hostRef.current ? createPortal(children, hostRef.current) : null,
    };
}
