import { useEffect, useRef, useState } from 'react';

type FadeState = { start: boolean; end: boolean };

export function useScrollFade(
    orientation: 'horizontal' | 'vertical' = 'horizontal',
    deps: unknown[] = []
) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [fade, setFade] = useState<FadeState>({ start: false, end: false });

    useEffect(() => {
        const node = scrollRef.current;
        if (!node) return;

        const compute = () => {
            if (orientation === 'horizontal') {
                const maxScroll = node.scrollWidth - node.clientWidth;
                const start = node.scrollLeft > 2;
                const end = node.scrollLeft < maxScroll - 2;
                setFade((prev) =>
                    prev.start === start && prev.end === end
                        ? prev
                        : { start, end }
                );
                return;
            }

            const maxScroll = node.scrollHeight - node.clientHeight;
            const start = node.scrollTop > 2;
            const end = node.scrollTop < maxScroll - 2;
            setFade((prev) =>
                prev.start === start && prev.end === end ? prev : { start, end }
            );
        };

        compute();
        const onScroll = () => compute();
        node.addEventListener('scroll', onScroll, { passive: true });
        const resizeObserver = new ResizeObserver(() => compute());
        resizeObserver.observe(node);

        return () => {
            node.removeEventListener('scroll', onScroll);
            resizeObserver.disconnect();
        };
    }, [orientation, ...deps]);

    return { scrollRef, fade };
}
