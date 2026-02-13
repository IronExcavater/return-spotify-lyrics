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
};

export function useHeroCollapse({
    enabled = true,
    scrollRef,
    resetKey,
    range,
    collapseDistance,
    resetScroll = true,
    padding,
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
    const lastScrollTopRef = useRef(0);
    const rafRef = useRef<number | null>(null);
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
        lastScrollTopRef.current = 0;
        heroProgressRef.current = 0;
        heroRef.current?.style.setProperty('--hero-collapse', '0');
        if (resetScroll && scrollRef?.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [resetScroll, scrollRef]);

    useEffect(() => {
        reset();
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [reset, resetKey]);

    useEffect(() => {
        if (!enabled) {
            heroRef.current?.style.setProperty('--hero-collapse', '0');
            return;
        }
        const node = scrollRef?.current;
        if (!node) return;
        const handleScroll = () => {
            lastScrollTopRef.current = node.scrollTop;
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                const compensatedScroll =
                    lastScrollTopRef.current +
                    heroProgressRef.current * resolvedCollapseDistance;
                const progress = Math.min(
                    1,
                    Math.max(0, compensatedScroll / resolvedRange)
                );
                if (Math.abs(progress - heroProgressRef.current) < 0.001)
                    return;
                heroProgressRef.current = progress;
                heroRef.current?.style.setProperty(
                    '--hero-collapse',
                    String(progress)
                );
            });
        };
        node.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            node.removeEventListener('scroll', handleScroll);
        };
    }, [enabled, resolvedRange, resolvedCollapseDistance, scrollRef]);

    return { heroRef, paddingTop, paddingBottom };
}
