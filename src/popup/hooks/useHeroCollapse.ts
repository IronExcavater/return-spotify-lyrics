import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';

export const HERO_COLLAPSE_METRICS = {
    topMax: 12,
    topMin: 4,
    bottomMax: 18,
    bottomMin: 8,
    range: 48,
} as const;

const BASE_COLLAPSE_DISTANCE =
    HERO_COLLAPSE_METRICS.topMax -
    HERO_COLLAPSE_METRICS.topMin +
    (HERO_COLLAPSE_METRICS.bottomMax - HERO_COLLAPSE_METRICS.bottomMin);

type UseHeroCollapseOptions = {
    enabled?: boolean;
    scrollRef?: RefObject<HTMLElement | null>;
    resetKey?: string;
    range?: number;
    collapseDistance?: number;
    resetScroll?: boolean;
    padding?: {
        topMax: number;
        topMin: number;
        bottomMax: number;
        bottomMin: number;
    };
    onProgress?: (progress: number) => void;
};

export function useHeroCollapse({
    enabled = true,
    scrollRef,
    resetKey,
    range,
    collapseDistance,
    resetScroll = true,
    padding,
    onProgress,
}: UseHeroCollapseOptions) {
    const resolvedPadding = {
        topMax: padding?.topMax ?? HERO_COLLAPSE_METRICS.topMax,
        topMin: padding?.topMin ?? HERO_COLLAPSE_METRICS.topMin,
        bottomMax: padding?.bottomMax ?? HERO_COLLAPSE_METRICS.bottomMax,
        bottomMin: padding?.bottomMin ?? HERO_COLLAPSE_METRICS.bottomMin,
    };
    const resolvedCollapseDistance =
        collapseDistance ??
        resolvedPadding.topMax -
            resolvedPadding.topMin +
            (resolvedPadding.bottomMax - resolvedPadding.bottomMin);
    const scaledRange =
        BASE_COLLAPSE_DISTANCE > 0
            ? Math.round(
                  (resolvedCollapseDistance / BASE_COLLAPSE_DISTANCE) *
                      HERO_COLLAPSE_METRICS.range
              )
            : HERO_COLLAPSE_METRICS.range;
    const resolvedRange = Math.max(
        range ?? HERO_COLLAPSE_METRICS.range,
        scaledRange
    );
    const heroRef = useRef<HTMLDivElement | null>(null);
    const heroProgressRef = useRef(0);
    const buildPaddingCalc = (max: number, min: number) =>
        `calc(${max}px - ${max - min}px * var(--hero-collapse, 0))`;
    const paddingTop = buildPaddingCalc(
        resolvedPadding.topMax,
        resolvedPadding.topMin
    );
    const paddingBottom = buildPaddingCalc(
        resolvedPadding.bottomMax,
        resolvedPadding.bottomMin
    );

    const reset = useCallback(() => {
        heroProgressRef.current = 0;
        heroRef.current?.style.setProperty('--hero-collapse', '0');
        onProgress?.(0);
        if (resetScroll && scrollRef?.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [onProgress, resetScroll, scrollRef]);

    useEffect(() => {
        reset();
    }, [reset, resetKey]);

    useEffect(() => {
        if (!enabled) {
            heroRef.current?.style.setProperty('--hero-collapse', '0');
            return;
        }
        const node = scrollRef?.current;
        if (!node) return;
        const handleScroll = () => {
            const progress = Math.min(
                1,
                Math.max(0, node.scrollTop / resolvedRange)
            );
            if (progress === heroProgressRef.current) return;
            heroProgressRef.current = progress;
            heroRef.current?.style.setProperty(
                '--hero-collapse',
                String(progress)
            );
            onProgress?.(progress);
        };
        node.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => {
            node.removeEventListener('scroll', handleScroll);
        };
    }, [enabled, onProgress, resolvedRange, scrollRef]);

    return { heroRef, paddingTop, paddingBottom };
}
