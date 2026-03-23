import { useEffect, useLayoutEffect, useRef } from 'react';
import { Flex } from '@radix-ui/themes';

import { TOAST_EXIT_DURATION_MS } from '../data/toastStore';
import { useToasts } from '../hooks/useToast';
import { Toast } from './Toast';

export function ToastViewport() {
    const toasts = useToasts();
    const toastRefs = useRef(new Map<string, HTMLDivElement>());
    const previousTopsRef = useRef(new Map<string, number>());
    const animationsRef = useRef(new Map<string, Animation>());

    useEffect(() => {
        const activeToastIds = new Set(toasts.map(({ id }) => id));

        for (const id of toastRefs.current.keys()) {
            if (activeToastIds.has(id)) continue;
            toastRefs.current.delete(id);
        }

        for (const id of previousTopsRef.current.keys()) {
            if (activeToastIds.has(id)) continue;
            previousTopsRef.current.delete(id);
        }

        for (const [id, animation] of animationsRef.current) {
            if (activeToastIds.has(id)) continue;
            animation.cancel();
            animationsRef.current.delete(id);
        }
    }, [toasts]);

    useEffect(
        () => () => {
            animationsRef.current.forEach((animation) => animation.cancel());
            animationsRef.current.clear();
        },
        []
    );

    useLayoutEffect(() => {
        const nextTops = new Map<string, number>();

        for (const toast of toasts) {
            const node = toastRefs.current.get(toast.id);
            if (!node) continue;

            const nextTop = node.getBoundingClientRect().top;
            nextTops.set(toast.id, nextTop);

            const previousTop = previousTopsRef.current.get(toast.id);
            if (previousTop == null) continue;

            const deltaY = previousTop - nextTop;
            if (Math.abs(deltaY) < 1) continue;

            const previousAnimation = animationsRef.current.get(toast.id);
            previousAnimation?.cancel();

            const animation = node.animate(
                [
                    { transform: `translateY(${deltaY}px)` },
                    { transform: 'translateY(0)' },
                ],
                {
                    duration: TOAST_EXIT_DURATION_MS,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }
            );

            animation.onfinish = () => {
                if (animationsRef.current.get(toast.id) === animation) {
                    animationsRef.current.delete(toast.id);
                }
            };

            animation.oncancel = () => {
                if (animationsRef.current.get(toast.id) === animation) {
                    animationsRef.current.delete(toast.id);
                }
            };

            animationsRef.current.set(toast.id, animation);
        }

        previousTopsRef.current = nextTops;
    }, [toasts]);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <Flex
            direction="column"
            gap="2"
            aria-live="polite"
            aria-relevant="additions removals"
            className="pointer-events-none fixed bottom-4 left-4 z-60 w-[min(20rem,calc(100vw-2rem))]"
        >
            {toasts.map((toast) => (
                <Flex
                    key={toast.id}
                    ref={(node) => {
                        if (!node) {
                            toastRefs.current.delete(toast.id);
                            return;
                        }

                        toastRefs.current.set(toast.id, node);
                    }}
                    className="w-full"
                >
                    <Toast toast={toast} />
                </Flex>
            ))}
        </Flex>
    );
}
