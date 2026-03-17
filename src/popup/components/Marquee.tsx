import {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import clsx from 'clsx';

import { useMirroredEvents } from '../hooks/useMirroredEvents';
import { useSettings } from '../hooks/useSettings';

interface Props {
    children: ReactNode;
    speed?: number;
    mode?: 'left' | 'right' | 'bounce';
    animateOnHover?: boolean;
    pauseWhenOffscreen?: boolean;
    className?: string;
    grow?: boolean | number;
    style?: CSSProperties;
    maxWidth?: number | string;
    sidePadding?: number;
    gap?: number;
    separatorColor?: 'current' | 'accent' | 'gray' | string;
    separatorClassName?: string;
    separatorSize?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | string;
}

export function Marquee({
    children,
    speed = 10,
    mode = 'left',
    animateOnHover = false,
    pauseWhenOffscreen = true,
    sidePadding = 2,
    gap = 16,
    separatorColor = 'current',
    separatorClassName,
    separatorSize,
    className,
    grow,
    style,
    maxWidth,
}: Props) {
    const { settings } = useSettings();
    const containerRef = useRef<HTMLDivElement>(null);
    const originalRef = useRef<HTMLDivElement>(null);
    const cloneRef = useRef<HTMLDivElement>(null);
    const separatorRef = useRef<HTMLSpanElement>(null);

    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [scroll, setScroll] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [animationKey, setAnimationKey] = useState(0);
    const [autoSeparatorStyle, setAutoSeparatorStyle] = useState<{
        color?: string;
        fontSize?: string;
        lineHeight?: string;
    }>({});
    const MIN_DURATION = 4;
    const lastContentRef = useRef<string>('');

    useEffect(() => {
        const compute = () => {
            const pad = sidePadding ?? 0;
            const rawContainerW = containerRef.current?.clientWidth ?? 0;
            const containerW = Math.max(0, rawContainerW - pad * 2);
            const originalW = originalRef.current?.scrollWidth ?? 0;
            const content = originalRef.current?.textContent ?? '';

            const shouldScroll = originalW - containerW > 0.5;
            setScroll(shouldScroll);

            const overflow = Math.max(0, originalW - containerW);
            if (!shouldScroll || containerW === 0 || originalW === 0) {
                setDistance(0);
                setDuration(0);
                if (content !== lastContentRef.current) {
                    lastContentRef.current = content;
                    setAnimationKey((key) => key + 1);
                }
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

            if (content !== lastContentRef.current) {
                lastContentRef.current = content;
                setAnimationKey((key) => key + 1);
            }
        };

        compute();

        const sample =
            originalRef.current?.querySelector<HTMLElement>('.rt-Text') ??
            originalRef.current?.querySelector<HTMLElement>('*') ??
            (originalRef.current?.firstElementChild as HTMLElement | null) ??
            originalRef.current;
        if (sample) {
            const style = getComputedStyle(sample);
            setAutoSeparatorStyle((prev) => {
                if (
                    prev.color === style.color &&
                    prev.fontSize === style.fontSize &&
                    prev.lineHeight === style.lineHeight
                )
                    return prev;
                return {
                    color: style.color,
                    fontSize: style.fontSize,
                    lineHeight: style.lineHeight,
                };
            });
        }

        const observer = new ResizeObserver(compute);
        if (containerRef.current) observer.observe(containerRef.current);
        if (originalRef.current) observer.observe(originalRef.current);
        if (separatorRef.current) observer.observe(separatorRef.current);

        return () => {
            observer.disconnect();
        };
    }, [
        sidePadding,
        gap,
        mode,
        speed,
        separatorColor,
        separatorSize,
        autoSeparatorStyle.color,
        autoSeparatorStyle.fontSize,
        autoSeparatorStyle.lineHeight,
        animationKey,
    ]);

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
    const growClass = grow === true ? 'grow' : undefined;
    const growStyle = typeof grow === 'number' ? { flexGrow: grow } : undefined;

    const resolvedSeparatorColor =
        separatorColor === 'accent'
            ? 'var(--accent-11)'
            : separatorColor === 'gray'
              ? 'var(--gray-11)'
              : separatorColor === 'current'
                ? (autoSeparatorStyle.color ?? 'currentColor')
                : (separatorColor ??
                  autoSeparatorStyle.color ??
                  'currentColor');
    const resolvedSeparatorSize =
        typeof separatorSize === 'number'
            ? `var(--font-size-${separatorSize})`
            : (separatorSize ?? autoSeparatorStyle.fontSize);
    const resolvedSeparatorLineHeight =
        autoSeparatorStyle.lineHeight ?? 'normal';

    useMirroredEvents({
        sourceRef: originalRef,
        mirrorRef: cloneRef,
        enabled: showClone,
        resetKey: animationKey,
    });

    return (
        <div
            ref={containerRef}
            className={clsx(
                'flex min-w-0 shrink overflow-hidden whitespace-nowrap',
                growClass,
                className
            )}
            style={{
                paddingInline: sidePadding,
                ...growStyle,
                maxWidth,
                ...style,
            }}
        >
            {}
            <div
                key={animationKey}
                className={clsx(
                    'inline-flex items-center',
                    shouldAnimate && mode === 'left' && 'animate-marquee-left',
                    shouldAnimate &&
                        mode === 'right' &&
                        'animate-marquee-right',
                    shouldAnimate &&
                        mode === 'bounce' &&
                        'animate-marquee-bounce',
                    !shouldAnimate && 'marquee-reset',
                    resolvedAnimateOnHover && 'marquee-play-on-hover'
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
                                className={clsx(
                                    'inline-flex items-center text-inherit',
                                    separatorClassName
                                )}
                                style={{
                                    paddingInline: separatorPadding,
                                    color: resolvedSeparatorColor,
                                    fontSize: resolvedSeparatorSize,
                                    lineHeight: resolvedSeparatorLineHeight,
                                }}
                            >
                                {'\u2022'}
                            </span>
                            <div
                                ref={cloneRef}
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
