import { useEffect, type RefObject } from 'react';

const MIRRORED_EVENT_TYPES = [
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

type UseMirroredEventsOptions = {
    sourceRef: RefObject<HTMLElement | null>;
    mirrorRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    resetKey?: number | string;
};

function getElementPath(root: HTMLElement, target: Element) {
    if (!root.contains(target)) return null;

    const path: number[] = [];
    let current: Element | null = target;

    while (current && current !== root) {
        const parent = current.parentElement;
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
    if (!path) return null;

    return resolveElementPath(targetRoot, path);
}

function resolveMirroredRelatedTarget(
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
    const mirroredTarget = resolveMirroredTarget(
        sourceRoot,
        targetRoot,
        event.target
    );
    if (!mirroredTarget) return;

    const mirroredRelatedTarget = resolveMirroredRelatedTarget(
        sourceRoot,
        targetRoot,
        event
    );

    if (event instanceof PointerEvent) {
        mirroredTarget.dispatchEvent(
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
        mirroredTarget.dispatchEvent(
            new MouseEvent(event.type, {
                bubbles: true,
                cancelable: false,
                relatedTarget: mirroredRelatedTarget,
                view: window,
            })
        );
        return;
    }

    if (event instanceof FocusEvent) {
        mirroredTarget.dispatchEvent(
            new FocusEvent(event.type, {
                bubbles: true,
                cancelable: false,
                relatedTarget: mirroredRelatedTarget,
            })
        );
    }
}

export function useMirroredEvents({
    sourceRef,
    mirrorRef,
    enabled,
    resetKey,
}: UseMirroredEventsOptions) {
    useEffect(() => {
        if (!enabled) return;

        const source = sourceRef.current;
        const mirror = mirrorRef.current;
        if (!source || !mirror) return;

        let syncing = false;
        const cleanups: Array<() => void> = [];

        for (const [from, to] of [
            [source, mirror],
            [mirror, source],
        ] as const) {
            for (const eventType of MIRRORED_EVENT_TYPES) {
                const handleEvent = (event: Event) => {
                    if (syncing) return;

                    syncing = true;
                    try {
                        mirrorEvent(from, to, event);
                    } finally {
                        syncing = false;
                    }
                };

                from.addEventListener(eventType, handleEvent, true);
                cleanups.push(() => {
                    from.removeEventListener(eventType, handleEvent, true);
                });
            }
        }

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [enabled, mirrorRef, resetKey, sourceRef]);
}
