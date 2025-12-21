import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface MarqueeProps {
    children: ReactNode;
    speed?: number;
    mode?: 'left' | 'right' | 'bounce';
    pauseOnHover?: boolean;
    className?: string;
}

export function Marquee({
    children,
    speed = 10,
    mode = 'left',
    pauseOnHover = true,
    className,
}: MarqueeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);

    const [duration, setDuration] = useState(0);
    const [hidden, setHidden] = useState(0);
    const [scroll, setScroll] = useState(false);

    useEffect(() => {
        const compute = () => {
            const containerW = containerRef.current?.clientWidth ?? 0;
            const originalW = originalRef.current?.scrollWidth ?? 0;

            const shouldScroll = originalW > containerW;
            setScroll(shouldScroll);

            const hidden = Math.max(0, originalW - containerW);
            setHidden(hidden);

            setDuration(containerW / speed);
        };

        compute();

        const observer = new ResizeObserver(compute);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [speed]);

    return (
        <div
            ref={containerRef}
            className={clsx(
                'flex min-w-0 flex-shrink overflow-hidden whitespace-nowrap',
                className
            )}
        >
            <div
                className={clsx(
                    'inline-flex items-center',
                    scroll && `animate-marquee-${mode}`,
                    pauseOnHover && 'marquee-pause'
                )}
                style={
                    {
                        '--marquee-distance': `${-hidden}px`,
                        animationDuration: `${duration}s`,
                    } as CSSProperties
                }
            >
                <div ref={originalRef} className="relative">
                    {children}
                </div>
                <div
                    className={clsx(
                        'absolute top-0 left-full',
                        (!scroll || mode === 'bounce') && 'invisible'
                    )}
                    style={{
                        marginLeft: '12px',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
