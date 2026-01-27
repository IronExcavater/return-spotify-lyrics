import { RefObject, useLayoutEffect, useRef, useState } from 'react';

type WidthOptions = {
    round?: number;
};

export function useElementWidth(
    ref: RefObject<HTMLElement | null>,
    options: WidthOptions = {}
) {
    const [width, setWidth] = useState<number | null>(null);
    const { round = 0 } = options;

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;

        const measure = () => {
            let next = node.getBoundingClientRect().width;
            if (round > 0) next = Math.round(next / round) * round;
            setWidth((prev) => (prev === next ? prev : next));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, round]);

    return width;
}

type ConstrainedWidthOptions = {
    baseRef: RefObject<HTMLElement | null>;
    subtractRef?: RefObject<HTMLElement | null>;
    gap?: number;
    round?: number;
};

export function useConstrainedWidth({
    baseRef,
    subtractRef,
    gap = 0,
    round = 0,
}: ConstrainedWidthOptions) {
    const emptyRef = useRef<HTMLElement | null>(null);
    const base = useElementWidth(baseRef, { round });
    const subtract = useElementWidth(subtractRef ?? emptyRef, { round });
    if (base == null) return undefined;
    if (!subtractRef) return base;
    return Math.max(0, base - (subtract ?? 0) - gap);
}
