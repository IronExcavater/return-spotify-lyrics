import { useEffect, type RefObject } from 'react';

const EVENT_TYPES = [
    'mouseover',
    'mouseout',
    'pointerover',
    'pointerout',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'focusin',
    'focusout',
] as const;

function getElementPath(root: HTMLElement, target: Element) {
    if (!root.contains(target)) return null;

    const path: number[] = [];
    let current: Element | null = target;

    while (current && current !== root) {
        const parent: Element | null = current.parentElement;
        if (!parent) return null;

        const index = Array.prototype.indexOf.call(parent.children, current);
        if (index < 0) return null;

        path.unshift(index);
        current = parent;
    }

    return current === root ? path : null;
}

function resolveElementPath(root: HTMLElement, path: number[]) {
    let current: Element = root;

    for (const index of path) {
        const next = current.children.item(index);
        if (!(next instanceof HTMLElement)) return null;
        current = next;
    }

    return current instanceof HTMLElement ? current : null;
}

function resolveMirroredTarget(
    sourceRoot: HTMLElement,
    targetRoot: HTMLElement,
    target: EventTarget | null
) {
    if (!(target instanceof Element)) return null;

    const path = getElementPath(sourceRoot, target);
    return path ? resolveElementPath(targetRoot, path) : null;
}

function resolveRelatedTarget(
    sourceRoot: HTMLElement,
    targetRoot: HTMLElement,
    event: Event
) {
    if (event instanceof MouseEvent || event instanceof FocusEvent) {
        return resolveMirroredTarget(
            sourceRoot,
            targetRoot,
            event.relatedTarget
        );
    }

    return null;
}

function mirrorEvent(
    sourceRoot: HTMLElement,
    targetRoot: HTMLElement,
    event: Event
) {
    const target = resolveMirroredTarget(sourceRoot, targetRoot, event.target);
    if (!target) return;

    const relatedTarget = resolveRelatedTarget(sourceRoot, targetRoot, event);

    if (typeof PointerEvent !== 'undefined' && event instanceof PointerEvent) {
        target.dispatchEvent(
            new PointerEvent(event.type, {
                bubbles: true,
                cancelable: false,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                isPrimary: event.isPrimary,
                button: event.button,
                buttons: event.buttons,
                clientX: event.clientX,
                clientY: event.clientY,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey,
            })
        );
        return;
    }

    if (event instanceof MouseEvent) {
        target.dispatchEvent(
            new MouseEvent(event.type, {
                bubbles: true,
                cancelable: false,
                relatedTarget,
                view: window,
            })
        );
        return;
    }

    if (event instanceof FocusEvent) {
        target.dispatchEvent(
            new FocusEvent(event.type, {
                bubbles: true,
                cancelable: false,
                relatedTarget,
            })
        );
    }
}

type Options = {
    rootsRef: RefObject<Array<HTMLElement | null>>;
    count: number;
    enabled: boolean;
    resetKey: number;
};

export function useMirroredMarqueeEvents({
    rootsRef,
    count,
    enabled,
    resetKey,
}: Options) {
    useEffect(() => {
        if (!enabled) return;

        const roots = rootsRef.current
            .slice(0, count)
            .filter(Boolean) as HTMLElement[];
        if (roots.length < 2) return;

        let syncing = false;
        const cleanups: Array<() => void> = [];

        for (const source of roots) {
            for (const eventType of EVENT_TYPES) {
                const handleEvent = (event: Event) => {
                    if (syncing) return;

                    syncing = true;
                    try {
                        for (const target of roots) {
                            if (target !== source)
                                mirrorEvent(source, target, event);
                        }
                    } finally {
                        syncing = false;
                    }
                };

                source.addEventListener(eventType, handleEvent, true);
                cleanups.push(() =>
                    source.removeEventListener(eventType, handleEvent, true)
                );
            }
        }

        return () => cleanups.forEach((cleanup) => cleanup());
    }, [count, enabled, resetKey, rootsRef]);
}
