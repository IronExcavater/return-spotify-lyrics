import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface Props {
    children: ReactNode;
    speed?: number;
    mode?: 'left' | 'right' | 'bounce';
    pauseOnHover?: boolean;
    className?: string;
    sidePadding?: number;
    gap?: number;
}

export function Marquee({
    children,
    speed = 10,
    mode = 'left',
    pauseOnHover = true,
    sidePadding = 2,
    gap = 16,
    className,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);

    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [scroll, setScroll] = useState(false);
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
            const travel = mode === 'bounce' ? overflow : originalW + gap;
            const seconds = Math.max(travel / baseSpeed, MIN_DURATION);
            setDistance(travel);
            setDuration(seconds);
        };

        compute();

        const observer = new ResizeObserver(compute);
        if (containerRef.current) observer.observe(containerRef.current);
        if (originalRef.current) observer.observe(originalRef.current);

        return () => observer.disconnect();
    }, [sidePadding, gap, mode, speed]);

    const showClone = scroll && mode !== 'bounce';

    return (
        <div
            ref={containerRef}
            className={clsx(
                'flex flex-shrink overflow-hidden whitespace-nowrap',
                className
            )}
            style={{ paddingInline: sidePadding }}
        >
            <div
                className={clsx(
                    'inline-flex items-center',
                    scroll && `animate-marquee-${mode}`,
                    pauseOnHover && 'marquee-pause'
                )}
                style={
                    {
                        '--marquee-distance': `${-distance}px`,
                        animationDuration: `${duration}s`,
                    } as CSSProperties
                }
            >
                <div
                    className="inline-flex items-center"
                    style={{ gap: showClone ? `${gap}px` : undefined }}
                >
                    <div
                        ref={originalRef}
                        className="inline-flex shrink-0 items-center"
                    >
                        {children}
                    </div>
                    {showClone && (
                        <div
                            className="inline-flex shrink-0 items-center"
                            aria-hidden="true"
                        >
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
