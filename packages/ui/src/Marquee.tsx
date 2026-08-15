import {
    useEffect,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type CSSProperties,
    type ReactNode,
} from 'react';
import clsx from 'clsx';

import { useMirroredMarqueeEvents } from './marqueeEvents';
import './marquee.css';

export type MarqueeMode = 'left' | 'right' | 'bounce';
export type MarqueeCopies = number | 'auto';

export function shouldMarqueeScroll(
    contentWidth: number,
    viewportWidth: number,
    force: boolean
) {
    return force || contentWidth - viewportWidth > 0.5;
}

export function getMarqueeCopyCount(
    copies: MarqueeCopies,
    viewportWidth: number,
    unitWidth: number
) {
    if (copies !== 'auto') return Math.max(1, Math.floor(copies));
    if (unitWidth <= 0) return 1;

    return Math.max(1, Math.ceil(viewportWidth / unitWidth) + 1);
}

export function getMarqueeDistance(
    mode: MarqueeMode,
    contentWidth: number,
    viewportWidth: number,
    separatorWidth: number
) {
    if (mode === 'bounce') {
        return Math.max(0, contentWidth - viewportWidth);
    }

    return contentWidth + separatorWidth;
}

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(query.matches);

        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return reduced;
}

function separatorColorValue(color: string | undefined, fallback?: string) {
    if (color === 'accent') return 'var(--color-accent)';
    if (color === 'gray' || color === 'muted') return 'var(--color-muted)';
    if (color === 'current' || color == null) return fallback ?? 'currentColor';
    return color;
}

export type MarqueeProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
    children: ReactNode;
    speed?: number;
    minDuration?: number;
    mode?: MarqueeMode;
    force?: boolean;
    copies?: MarqueeCopies;
    animateOnHover?: boolean;
    pauseWhenOffscreen?: boolean;
    grow?: boolean | number;
    maxWidth?: number | string;
    gap?: number;
    separator?: ReactNode;
    separatorColor?: 'current' | 'accent' | 'gray' | 'muted' | string;
    separatorClassName?: string;
    separatorSize?: number | string;
    viewportClassName?: string;
};

export function Marquee({
    children,
    speed = 10,
    minDuration = 4,
    mode = 'left',
    force = false,
    copies = 1,
    animateOnHover = false,
    pauseWhenOffscreen = true,
    grow,
    maxWidth,
    gap = 16,
    separator = '\u2022',
    separatorColor = 'current',
    separatorClassName,
    separatorSize,
    viewportClassName,
    className,
    style,
    ...props
}: MarqueeProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);
    const separatorMeasureRef = useRef<HTMLSpanElement>(null);
    const rootsRef = useRef<Array<HTMLElement | null>>([]);
    const lastContentRef = useRef('');

    const [scrolling, setScrolling] = useState(false);
    const [cloneCount, setCloneCount] = useState(0);
    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [visible, setVisible] = useState(true);
    const [animationKey, setAnimationKey] = useState(0);
    const [separatorStyle, setSeparatorStyle] = useState<{
        color?: string;
        fontSize?: string;
        lineHeight?: string;
    }>({});

    const reducedMotion = useReducedMotion();

    useEffect(() => {
        const viewport = viewportRef.current;
        const original = originalRef.current;
        if (!viewport || !original) return;

        const compute = () => {
            const viewportWidth = viewport.clientWidth;
            const contentWidth = original.scrollWidth;
            const content = original.textContent ?? '';
            const overflow = Math.max(0, contentWidth - viewportWidth);

            const requestedScroll = shouldMarqueeScroll(
                contentWidth,
                viewportWidth,
                force
            );
            const canScroll =
                mode === 'bounce' ? overflow > 0.5 : requestedScroll;
            const separatorWidth =
                mode === 'bounce'
                    ? 0
                    : (separatorMeasureRef.current?.getBoundingClientRect()
                          .width ?? gap);
            const travel = canScroll
                ? getMarqueeDistance(
                      mode,
                      contentWidth,
                      viewportWidth,
                      separatorWidth
                  )
                : 0;
            const unitWidth = contentWidth + separatorWidth;
            const nextCopies =
                canScroll && mode !== 'bounce'
                    ? getMarqueeCopyCount(copies, viewportWidth, unitWidth)
                    : 0;
            const pixelsPerSecond = Math.max(
                1,
                mode === 'bounce' ? speed * 0.85 : speed
            );

            setScrolling(canScroll);
            setCloneCount(nextCopies);
            setDistance(travel);
            setDuration(
                travel > 0 ? Math.max(travel / pixelsPerSecond, minDuration) : 0
            );

            if (content !== lastContentRef.current) {
                lastContentRef.current = content;
                setAnimationKey((key) => key + 1);
            }

            const sample = original.querySelector<HTMLElement>('*') ?? original;
            const computed = getComputedStyle(sample);
            setSeparatorStyle((previous) => {
                if (
                    previous.color === computed.color &&
                    previous.fontSize === computed.fontSize &&
                    previous.lineHeight === computed.lineHeight
                ) {
                    return previous;
                }

                return {
                    color: computed.color,
                    fontSize: computed.fontSize,
                    lineHeight: computed.lineHeight,
                };
            });
        };

        compute();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(compute);
        observer.observe(viewport);
        observer.observe(original);
        if (separatorMeasureRef.current) {
            observer.observe(separatorMeasureRef.current);
        }

        return () => observer.disconnect();
    }, [copies, force, gap, minDuration, mode, speed, children]);

    useEffect(() => {
        if (!pauseWhenOffscreen) return;
        const node = viewportRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry) setVisible(entry.isIntersecting);
            },
            { rootMargin: '120px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [pauseWhenOffscreen]);

    const showCopies = scrolling && mode !== 'bounce' && cloneCount > 0;
    const instanceCount = showCopies ? cloneCount + 1 : 1;
    const shouldAnimate =
        scrolling && distance > 0 && (!pauseWhenOffscreen || visible);
    const playOnHover = animateOnHover || reducedMotion;
    const separatorPadding = gap / 2;
    const resolvedSeparatorColor = separatorColorValue(
        separatorColor,
        separatorStyle.color
    );
    const resolvedSeparatorSize =
        typeof separatorSize === 'number'
            ? `${separatorSize}px`
            : (separatorSize ?? separatorStyle.fontSize);

    useMirroredMarqueeEvents({
        rootsRef,
        count: instanceCount,
        enabled: showCopies,
        resetKey: animationKey,
    });

    const setRootRef = (index: number, node: HTMLDivElement | null) => {
        rootsRef.current[index] = node;
        if (index === 0) originalRef.current = node;
    };

    const separatorNode = (key: string) => (
        <span
            key={key}
            aria-hidden="true"
            className={clsx(
                'inline-flex shrink-0 items-center text-inherit',
                separatorClassName
            )}
            style={{
                paddingInline: separatorPadding,
                color: resolvedSeparatorColor,
                fontSize: resolvedSeparatorSize,
                lineHeight: separatorStyle.lineHeight ?? 'normal',
            }}
        >
            {separator}
        </span>
    );

    const items: ReactNode[] = [];
    for (let index = 0; index < instanceCount; index += 1) {
        items.push(
            <div
                key={`copy-${index}`}
                ref={(node) => setRootRef(index, node)}
                data-marquee-copy={index}
                aria-hidden={index === 0 ? undefined : true}
                className="inline-flex shrink-0 items-center"
            >
                {children}
            </div>
        );

        if (showCopies && index < instanceCount - 1) {
            items.push(separatorNode(`separator-${index}`));
        }
    }

    return (
        <div
            {...props}
            className={clsx(
                'relative min-w-0',
                grow === true && 'grow',
                className
            )}
            style={{
                ...(typeof grow === 'number' ? { flexGrow: grow } : undefined),
                maxWidth,
                ...style,
            }}
        >
            <span
                ref={separatorMeasureRef}
                aria-hidden="true"
                className={clsx(
                    'pointer-events-none invisible absolute inline-flex items-center',
                    separatorClassName
                )}
                style={{
                    paddingInline: separatorPadding,
                    color: resolvedSeparatorColor,
                    fontSize: resolvedSeparatorSize,
                    lineHeight: separatorStyle.lineHeight ?? 'normal',
                }}
            >
                {separator}
            </span>

            <div
                ref={viewportRef}
                data-marquee-viewport="true"
                className={clsx(
                    'min-w-0 overflow-hidden whitespace-nowrap',
                    viewportClassName
                )}
            >
                <div
                    key={animationKey}
                    className={clsx(
                        'inline-flex w-max items-center',
                        shouldAnimate && mode === 'left' && 'marquee-left',
                        shouldAnimate && mode === 'right' && 'marquee-right',
                        shouldAnimate && mode === 'bounce' && 'marquee-bounce',
                        !shouldAnimate && 'marquee-reset',
                        playOnHover && 'marquee-play-on-hover'
                    )}
                    style={
                        {
                            '--marquee-distance': `${-distance}px`,
                            animationDuration: `${duration}s`,
                        } as CSSProperties
                    }
                >
                    {items}
                </div>
            </div>
        </div>
    );
}
