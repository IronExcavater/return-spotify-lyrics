import {
    ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react';
import { createPortal } from 'react-dom';

interface UsePortalSlotOptions<Key extends string> {
    keys: readonly Key[];
    content: ReactNode;
    activeKey: Key | undefined;
    defaultKey: Key;
    enabled: boolean;
    anchorClassName?: string;
}

interface PortalSlotResult<Key extends string> {
    anchors: Record<Key, JSX.Element>;
    portal: ReactNode;
}

export function usePortalSlot<Key extends string>({
    keys,
    content,
    activeKey,
    defaultKey,
    enabled,
    anchorClassName = 'flex-shrink-0',
}: UsePortalSlotOptions<Key>): PortalSlotResult<Key> {
    const instanceId = useId();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const anchorsRef = useRef<Record<Key, HTMLDivElement | null>>(
        {} as Record<Key, HTMLDivElement | null>
    );

    if (!hostRef.current) {
        hostRef.current = document.createElement('div');
        hostRef.current.className = 'contents';
    }

    const resolvedKey = activeKey ?? defaultKey;

    for (const key of keys) {
        if (!(key in anchorsRef.current)) {
            anchorsRef.current[key] = null;
        }
    }

    const attachToAnchor = useCallback(
        (key: Key) => (node: HTMLDivElement | null) => {
            anchorsRef.current[key] = node;
            const host = hostRef.current;
            if (!host || !node || !enabled) return;

            if (key === resolvedKey && host.parentElement !== node) {
                node.appendChild(host);
            }
        },
        [enabled, resolvedKey]
    );

    useLayoutEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        if (!enabled) {
            host.remove();
            return;
        }

        const target = anchorsRef.current[resolvedKey];
        if (target && host.parentElement !== target) {
            target.appendChild(host);
        }
    }, [enabled, resolvedKey]);

    const anchors = useMemo(() => {
        return keys.reduce(
            (result, key) => {
                result[key] = (
                    <div
                        key={`${instanceId}-${key}`}
                        className={anchorClassName}
                        ref={attachToAnchor(key)}
                    />
                );
                return result;
            },
            {} as Record<Key, JSX.Element>
        );
    }, [anchorClassName, attachToAnchor, keys, instanceId]);

    const portal =
        enabled && hostRef.current
            ? createPortal(content, hostRef.current)
            : null;

    return { anchors, portal };
}
