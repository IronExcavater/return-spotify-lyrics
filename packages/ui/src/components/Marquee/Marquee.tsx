import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ComponentProps,
} from 'react';
import clsx from 'clsx';
import { toMilliseconds, type CssLength } from '../../helpers/css';
import type { Side } from '../../helpers/geometry';
import { countCopies, holdEasing } from '../../helpers/motion';
import useCopies from '../../hooks/useCopies';
import useReducedMotion from '../../hooks/useReducedMotion';
import FadeBox from '../FadeBox/FadeBox';
import Separator, { type SeparatorProps } from '../Separator/Separator';

export type MarqueeProps = ComponentProps<'div'> & {
    /**
     * The way the content moves: to the start or the end of its text, so right-to-left text moves the other way, or up
     * or down, which need a height. A bounce starts at the start of the text, so only the axis matters for it.
     */
    direction?: 'start' | 'end' | 'up' | 'down';
    /** A loop moves on and on, with copies after the content. A bounce moves back and forth across the overflow. */
    motion?: 'loop' | 'bounce';
    /** Moves a loop even when the content fits, with copies that fill the box. A bounce moves only when the content overflows. */
    fill?: boolean;
    /** What starts the motion: nothing, or a pointer or focus on the marquee. With reduced motion, a pointer or focus always starts it. */
    play?: 'auto' | 'hover';
    /** The speed in pixels a second. */
    speed?: number;
    /** How long the content waits before it first moves, in milliseconds. */
    delay?: number;
    /** How long the content rests at each end of a bounce, or at the start of each pass of a loop, in milliseconds. */
    rest?: number;
    /** The Separator between two copies in a loop, like `{ variant: 'cross', gap: 16 }`. Marquee sets its orientation. */
    separator?: Omit<SeparatorProps, 'orientation' | 'decorative'>;
    /** How far the edges fade. */
    fadeDepth?: CssLength;
};

type Sizes = { box: number; content: number; item: number; isRtl: boolean };

const NO_SIZES: Sizes = { box: 0, content: 0, item: 0, isRtl: false };

/**
 * Moves content that is too long for its box, so a person can read all of it. The copies of a loop render the same
 * children, and they share hover, press and text selection styles with the original.
 */
export default function Marquee({
    direction = 'start',
    motion = 'loop',
    fill = false,
    play = 'auto',
    speed = 40,
    delay = play === 'hover' ? 0 : 1000,
    rest = motion === 'bounce' ? 1000 : 0,
    separator = { variant: 'dot', gap: 12 },
    fadeDepth = 24,
    className,
    style,
    children,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
}: MarqueeProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const rewindFrom = useRef<number | null>(null);
    const [sizes, setSizes] = useState(NO_SIZES);
    const [engaged, setEngaged] = useState(false);
    const start = useReducedMotion() ? 'hover' : play;

    const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
    const isLoop = motion === 'loop';
    const overflow = sizes.content - sizes.box;
    // Browsers round sub-pixel sizes differently, so content within half a pixel of the box fits.
    const fits = overflow <= 0.5;
    const canMove = isLoop && fill ? sizes.content > 0 : !fits;
    const moving = canMove && (start === 'auto' || engaged);
    const copies = isLoop && canMove ? countCopies(sizes.box, sizes.item) : 0;
    const distance = isLoop ? sizes.item : Math.max(overflow, 0);
    const duration = distance / speed + rest / 1000;
    const restShare = duration > 0 ? rest / 1000 / duration : 0;
    // A bounce plays every other pass backwards, so half the rest goes at each end of a pass.
    const hold = isLoop
        ? { start: restShare }
        : { start: restShare / 2, end: restShare / 2 };
    const easing = holdEasing(isLoop ? 'linear' : 'ease-in-out', hold);

    useCopies(trackRef, copies > 0);

    useLayoutEffect(() => {
        const root = rootRef.current;
        const item = trackRef.current?.firstElementChild;
        const content = item?.firstElementChild;
        if (!root || !item || !content) return;

        const lengthOf = (element: Element) => {
            const { width, height } = element.getBoundingClientRect();
            return axis === 'y' ? height : width;
        };
        const measure = () => {
            const next = {
                box: lengthOf(root),
                content: lengthOf(content),
                item: lengthOf(item),
                isRtl: getComputedStyle(root).direction === 'rtl',
            };
            setSizes((previous) => (isSame(previous, next) ? previous : next));
        };
        const observer = new ResizeObserver(measure);
        for (const element of [root, item, content]) observer.observe(element);
        return () => observer.disconnect();
    }, [axis]);

    // The observer sets the attribute itself, so a scroll causes no render.
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !moving) return;

        const observer = new IntersectionObserver(([entry]) => {
            root.toggleAttribute('data-offscreen', !entry?.isIntersecting);
        });
        observer.observe(root);
        return () => {
            observer.disconnect();
            root.removeAttribute('data-offscreen');
        };
    }, [moving]);

    // A stop leaves the track part way, so it slides back to where the content starts.
    useLayoutEffect(() => {
        const root = rootRef.current;
        const track = trackRef.current;
        const from = rewindFrom.current;
        rewindFrom.current = null;
        if (moving || !root || !track || !from) return;

        // A loop looks the same one item along, so it goes to the nearer of the two.
        const to =
            isLoop && Math.abs(from) > distance / 2
                ? Math.sign(from) * distance
                : 0;
        const time = getComputedStyle(root).getPropertyValue(
            '--transition-duration-default'
        );
        track.animate(
            [
                { translate: toTranslate(from, axis) },
                { translate: toTranslate(to, axis) },
            ],
            { duration: toMilliseconds(time), easing: 'ease-out' }
        );
    }, [moving, isLoop, distance, axis]);

    const engage = () => {
        if (start === 'hover') setEngaged(true);
    };
    const release = () => {
        const track = trackRef.current;
        if (start !== 'hover' || !track) return;
        rewindFrom.current = readOffset(track, axis);
        setEngaged(false);
    };

    return (
        <FadeBox
            // The text decides its own direction, so a right-to-left title moves the other way.
            dir="auto"
            {...props}
            ref={rootRef}
            className={clsx('marquee', className)}
            enabled={!fits || moving}
            depth={fadeDepth}
            edges={findFadeEdges(axis, sizes.isRtl, moving)}
            data-direction={direction}
            data-motion={motion}
            data-axis={axis}
            data-rtl={sizes.isRtl || undefined}
            data-play={start}
            data-moving={moving || undefined}
            style={{
                '--marquee-distance': `${distance}px`,
                '--marquee-duration': `${duration}s`,
                '--marquee-delay': `${delay}ms`,
                '--marquee-easing': easing,
                ...style,
            }}
            onPointerEnter={(event) => {
                onPointerEnter?.(event);
                engage();
            }}
            onPointerLeave={(event) => {
                onPointerLeave?.(event);
                if (!event.currentTarget.contains(document.activeElement)) {
                    release();
                }
            }}
            onFocus={(event) => {
                onFocus?.(event);
                engage();
            }}
            onBlur={(event) => {
                onBlur?.(event);
                const target = event.currentTarget;
                const isStaying =
                    target.contains(event.relatedTarget) ||
                    target.matches(':hover');
                if (!isStaying) release();
            }}
        >
            <div ref={trackRef} data-part="track">
                {Array.from({ length: copies + 1 }, (_, index) => (
                    <div
                        key={index}
                        data-part="item"
                        data-copy={index > 0 || undefined}
                        aria-hidden={index > 0 || undefined}
                    >
                        <div data-part="content">{children}</div>
                        {copies > 0 && (
                            <Separator
                                {...separator}
                                decorative
                                orientation={
                                    axis === 'y' ? 'horizontal' : 'vertical'
                                }
                                data-part="separator"
                            />
                        )}
                    </div>
                ))}
            </div>
        </FadeBox>
    );
}

function isSame(a: Sizes, b: Sizes) {
    return (
        a.box === b.box &&
        a.content === b.content &&
        a.item === b.item &&
        a.isRtl === b.isRtl
    );
}

// A still marquee shows the start of its content, so only the edge at the end of the text, or the bottom, fades.
function findFadeEdges(
    axis: 'x' | 'y',
    isRtl: boolean,
    moving: boolean
): Side[] {
    if (axis === 'y') return moving ? ['top', 'bottom'] : ['bottom'];
    if (moving) return ['left', 'right'];
    return [isRtl ? 'left' : 'right'];
}

function toTranslate(offset: number, axis: 'x' | 'y') {
    return axis === 'y' ? `0 ${offset}px` : `${offset}px`;
}

// The computed translate is `none`, `x` or `x y`, so a missing part is 0.
function readOffset(track: HTMLElement, axis: 'x' | 'y') {
    const [x = 0, y = 0] = getComputedStyle(track)
        .translate.split(' ')
        .map((part) => parseFloat(part) || 0);
    return axis === 'y' ? y : x;
}
