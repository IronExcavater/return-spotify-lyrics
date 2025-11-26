import {
    CSSProperties,
    ReactNode,
    useLayoutEffect,
    useRef,
    useState,
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

export function Scrollable({
    children,
    speed = 12,
    delay = 0,
    mode = 'loop',
    gap = 8,
    pauseOnHover = true,
    className,
}: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [relativeSpeed, setSpeed] = useState(0);

    useLayoutEffect(() => {
        const c = containerRef.current;
        const t = innerRef.current;
        if (!c || !t) return;

        setShouldScroll(t.scrollWidth > c.clientWidth);

        const distance = t.scrollWidth;
        const seconds = (distance / 100) * speed;
        setSpeed(seconds);
    }, [children]);

    return (
        <div
            ref={containerRef}
            className={clsx('relative overflow-hidden', className)}
            style={
                {
                    '--speed': `${relativeSpeed}s`,
                    '--delay': `${delay}s`,
                } as CSSProperties
            }
        >
            <div
                ref={innerRef}
                className={clsx(
                    'marquee-base flex whitespace-nowrap',
                    `gap-${gap}`,
                    shouldScroll &&
                        (mode === 'loop' ? 'marquee-loop' : 'marquee-bounce'),
                    pauseOnHover && 'marquee-hover-pause'
                )}
            >
                {children}

                {/* Duplicate only in loop mode */}
                {shouldScroll && mode === 'loop' && children}
            </div>
        </div>
    );
}
