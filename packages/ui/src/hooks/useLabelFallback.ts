import { useLayoutEffect, type RefObject } from 'react';

// A label cut below this width says too little, so an icon says more.
const MIN_LABEL_WIDTH = 48;

/**
 * Sets `data-compact` on the element while a label in it, marked `data-part="label"`, would show less than a few
 * characters. A component with an icon to fall back on hides its labels then, and keeps them as its name.
 */
export default function useLabelFallback(
    ref: RefObject<HTMLElement | null>,
    hasFallback: boolean,
    content: unknown
): void {
    useLayoutEffect(() => {
        const root = ref.current;
        if (!root || !hasFallback) return;

        let frame = 0;
        // The check shows the full labels first, so the labels come back when the space grows.
        const fit = () => {
            root.removeAttribute('data-compact');
            const labels = root.querySelectorAll<HTMLElement>(
                '[data-part="label"]'
            );
            const isCut = Array.from(labels).some(
                (label) =>
                    label.clientWidth <
                    Math.min(label.scrollWidth, MIN_LABEL_WIDTH) - 0.5
            );
            root.toggleAttribute('data-compact', isCut);
        };
        // The observer waits a frame, so the change of size in the check doesn't loop the observer.
        const fitLater = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(fit);
        };

        fit();
        const observer = new ResizeObserver(fitLater);
        observer.observe(root);
        if (root.parentElement) observer.observe(root.parentElement);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            root.removeAttribute('data-compact');
        };
    }, [ref, hasFallback, content]);
}
