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
    const [buffer, setBuffer] = useState(0);
    const [scroll, setScroll] = useState(false);

    useEffect(() => {
        const compute = () => {
            const containerW = containerRef.current?.clientWidth ?? 0;
            const originalW = originalRef.current?.scrollWidth ?? 0;

            const shouldScroll = originalW > containerW;
            setScroll(shouldScroll);

            const hidden = Math.max(0, originalW - containerW);
            setHidden(hidden);

            setBuffer(originalW * 0.01);

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
                'flex overflow-hidden whitespace-nowrap',
                className
            )}
        >
            <div
                className={clsx(
                    scroll && `animate-marquee-${mode}`,
                    pauseOnHover && 'marquee-pause'
                )}
                style={
                    {
                        '--marquee-distance': `${-hidden - buffer}px`,
                        animationDuration: `${duration}s`,
                    } as CSSProperties
                }
            >
                <div ref={originalRef} className="inline-block">
                    {children}
                </div>
                <div
                    className={clsx(
                        'mx-3 inline-block',
                        (!scroll || mode === 'bounce') && 'invisible'
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
