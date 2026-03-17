import { useLayoutEffect, useRef } from 'react';

type Options = {
    headerFadeBleed: number;
    stickyHeader: boolean;
    dragging: boolean;
};

export function useSectionHeader({
    headerFadeBleed,
    stickyHeader,
    dragging,
}: Options) {
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLDivElement | null>(null);
    const headerHeightRef = useRef(0);
    const stickyHeaderEnabled = stickyHeader && !dragging;
    const headerFadeBleedPx = Math.max(0, headerFadeBleed);
    const headerFadeEdgeMask =
        headerFadeBleedPx > 0
            ? `linear-gradient(to right, rgba(0,0,0,1) 0px, rgba(0,0,0,0) ${headerFadeBleedPx}px, rgba(0,0,0,0) calc(100% - ${headerFadeBleedPx}px), rgba(0,0,0,1) 100%)`
            : null;

    useLayoutEffect(() => {
        const header = headerRef.current;
        const root = sectionRef.current;
        if (!header || !root) return;
        const update = () => {
            const height = header.getBoundingClientRect().height;
            if (Math.abs(height - headerHeightRef.current) < 0.5) return;
            headerHeightRef.current = height;
            root.style.setProperty(
                '--media-section-header-height',
                `${height}px`
            );
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    return {
        headerFadeBleedPx,
        headerFadeEdgeMask,
        headerRef,
        sectionRef,
        stickyHeaderEnabled,
    };
}
