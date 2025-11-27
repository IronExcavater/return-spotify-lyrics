import {
    ReactNode,
    useLayoutEffect,
    useRef,
    useState,
    CSSProperties,
} from 'react';
import clsx from 'clsx';

interface Props {
    children: ReactNode;
    speed?: number;
    delay?: number;
    mode?: 'loop' | 'bounce';
    gap?: number;
    pauseOnHover?: boolean;
    className?: string;
}

export function Marquee({
    children,
    speed = 12,
    delay = 0,
    mode = 'loop',
    gap = 12,
    pauseOnHover = true,
    className,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scrollNeeded, setScrollNeeded] = useState(false);
    const [duration, setDuration] = useState(0);

    useLayoutEffect(() => {
        const c = containerRef.current;
        const t = contentRef.current;
        if (!c || !t) return;

        const overflow = t.scrollWidth > c.clientWidth;
        setScrollNeeded(overflow);

        if (overflow) {
            const distance = t.scrollWidth - c.clientWidth;
            const seconds = (distance / 100) * speed;
            setDuration(seconds);
        }
    }, [children]);

    return (
        <div
            ref={containerRef}
            className={clsx('relative overflow-hidden', className)}
            style={
                {
                    '--marquee-duration': `${duration}s`,
                    '--marquee-delay': `${delay}s`,
                    '--marquee-gap': `${gap}px`,
                } as CSSProperties
            }
        >
            <div
                ref={contentRef}
                className={clsx(
                    'marquee-inner',
                    scrollNeeded &&
                        (mode === 'loop' ? 'marquee-loop' : 'marquee-bounce'),
                    pauseOnHover && 'marquee-pause-on-hover'
                )}
            >
                {children}

                {/* Duplicate only for loop mode */}
                {scrollNeeded && mode === 'loop' && (
                    <div className="ml-[var(--marquee-gap)]">{children}</div>
                )}
            </div>
        </div>
    );
}
