import { useEffect, type RefObject } from 'react';

/**
 * Sets `data-ready` on the element after its first layout and its fonts settle, so its CSS turns on transitions only
 * then. A value that the first layout sets, like a measured size, shows at once and doesn't animate.
 */
export default function useReady(
    ref: RefObject<HTMLElement | null>,
    isReady = true
): void {
    useEffect(() => {
        const element = ref.current;
        if (!element || !isReady) return;

        let cancelled = false;
        let frame = 0;
        const markReady = () => element.toggleAttribute('data-ready', true);
        // A late font changes the text sizes, and the observers apply the new sizes in the next frame.
        const waitTwoFrames = () => {
            if (cancelled) return;
            frame = requestAnimationFrame(() => {
                frame = requestAnimationFrame(markReady);
            });
        };
        void document.fonts.ready.then(waitTwoFrames).catch(console.error);
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
        };
    }, [ref, isReady]);
}
