import { useEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type GlobalOptions = {
    key: string;
    metaOrCtrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    enabled?: boolean;
};

export function useGlobalShortcut(
    handler: (event: KeyboardEvent) => void,
    {
        key,
        metaOrCtrl = false,
        shift = false,
        alt = false,
        enabled = true,
    }: GlobalOptions
) {
    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (metaOrCtrl && !event.metaKey && !event.ctrlKey) return;
            if (!metaOrCtrl && (event.metaKey || event.ctrlKey)) return;
            if (shift !== event.shiftKey) return;
            if (alt !== event.altKey) return;
            if (event.key.toLowerCase() !== key.toLowerCase()) return;
            handler(event);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [alt, enabled, handler, key, metaOrCtrl, shift]);
}

export const handleMenuTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>
) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
};
