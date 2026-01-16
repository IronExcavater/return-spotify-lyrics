import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { useSettings } from '../hooks/useSettings';

interface Props {
    children: ReactNode;
    speed?: number;
    mode?: 'left' | 'right' | 'bounce';
    animateOnHover?: boolean;
    pauseWhenOffscreen?: boolean;
    className?: string;
    sidePadding?: number;
    gap?: number;
}

export function Marquee({
    children,
    speed = 10,
    mode = 'left',
    animateOnHover = false,
    pauseWhenOffscreen = true,
    sidePadding = 2,
    gap = 16,
    className,
}: Props) {
    const { settings } = useSettings();
    const containerRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);
    const separatorRef = useRef<HTMLSpanElement>(null);

    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [scroll, setScroll] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const MIN_DURATION = 4;

    useEffect(() => {
        const compute = () => {
            const pad = sidePadding ?? 0;
            const rawContainerW = containerRef.current?.clientWidth ?? 0;
            const containerW = Math.max(0, rawContainerW - pad * 2);
            const originalW = originalRef.current?.scrollWidth ?? 0;

            const shouldScroll = originalW - containerW > 0.5;
            setScroll(shouldScroll);

            const overflow = Math.max(0, originalW - containerW);
            if (!shouldScroll || containerW === 0 || originalW === 0) {
                setDistance(0);
                setDuration(0);
                return;
            }

            const baseSpeed = Math.max(
                1,
                mode === 'bounce' ? speed * 0.85 : speed
            );
            const shouldClone = shouldScroll && mode !== 'bounce';
            const separatorWidth = shouldClone
                ? (separatorRef.current?.getBoundingClientRect().width ?? gap)
                : 0;
            const travel =
                mode === 'bounce' ? overflow : originalW + separatorWidth;
            const seconds = Math.max(travel / baseSpeed, MIN_DURATION);
            setDistance(travel);
            setDuration(seconds);
        };

        compute();

        const observer = new ResizeObserver(compute);
        if (containerRef.current) observer.observe(containerRef.current);
        if (originalRef.current) observer.observe(originalRef.current);
        if (separatorRef.current) observer.observe(separatorRef.current);

        return () => observer.disconnect();
    }, [sidePadding, gap, mode, speed]);

    useEffect(() => {
        if (!pauseWhenOffscreen) return;
        const node = containerRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry) setIsVisible(entry.isIntersecting);
            },
            { rootMargin: '120px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [pauseWhenOffscreen]);

    const resolvedAnimateOnHover = animateOnHover || settings.reducedMotion;
    const showClone = scroll && mode !== 'bounce';
    const shouldAnimate = scroll && (!pauseWhenOffscreen || isVisible);
    const separatorPadding = gap / 2;

    return (
        <div
            ref={containerRef}
            className={clsx(
                'flex min-w-0 flex-shrink overflow-hidden whitespace-nowrap',
                className
            )}
            style={{ paddingInline: sidePadding }}
        >
            <div
                className={clsx(
                    'inline-flex items-center',
                    shouldAnimate ? `animate-marquee-${mode}` : 'marquee-reset',
                    resolvedAnimateOnHover &&
                        '[animation-play-state:paused] group-hover:[animation-play-state:running]'
                )}
                style={
                    {
                        '--marquee-distance': `${-distance}px`,
                        animationDuration: `${duration}s`,
                    } as CSSProperties
                }
            >
                <div className="inline-flex items-center">
                    <div
                        ref={originalRef}
                        className="inline-flex shrink-0 items-center"
                    >
                        {children}
                    </div>
                    {showClone && (
                        <>
                            <span
                                ref={separatorRef}
                                aria-hidden="true"
                                className="inline-flex items-center text-[var(--gray-9)]"
                                style={{ paddingInline: separatorPadding }}
                            >
                                {'\u2022'}
                            </span>
                            <div
                                className="inline-flex shrink-0 items-center"
                                aria-hidden="true"
                            >
                                {children}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
