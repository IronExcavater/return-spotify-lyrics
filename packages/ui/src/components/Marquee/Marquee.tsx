import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ComponentProps,
    type ReactNode,
} from 'react';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../../helpers/css';
import FadeBox from '../FadeBox/FadeBox';
import {
    clearSelection,
    hideCopies,
    markMatches,
    mirrorSelection,
} from './mirror';
import {
    countCopies,
    restEasing,
    toMilliseconds,
    type MarqueeMode,
} from './motion';
import useReducedMotion from '../../hooks/useReducedMotion';

export type MarqueeProps = ComponentProps<'div'> & {
    /** How the content moves: in a loop to the left or the right, or back and forth. */
    mode?: MarqueeMode;
    /** When a loop moves: only when the content is wider than the box, or always, with copies to fill the box. A bounce moves only when the content is wider. */
    scroll?: 'overflow' | 'always';
    /** What starts the motion: nothing, or a pointer or focus on the marquee. With reduced motion, a pointer or focus always starts it. */
    trigger?: 'auto' | 'hover';
    /** The speed in pixels a second. */
    speed?: number;
    /** How long the content rests at the start of each pass, in milliseconds. */
    rest?: number;
    /** The node between two copies in a loop. */
    separator?: ReactNode;
    /** The space on each side of the separator. */
    gap?: CssLength;
    /** How far the edges fade. */
    fade?: CssLength;
};

type Sizes = { box: number; content: number; item: number };

const NO_SIZES: Sizes = { box: 0, content: 0, item: 0 };

/**
 * Moves content that is too wide for its box, so a person can read all of it. The copies of a loop render the same
 * children, and they share hover, press and text selection styles with the original.
 */
export default function Marquee({
    mode = 'left',
    scroll = 'overflow',
    trigger = 'auto',
    speed = 40,
    rest = 1000,
    separator = '•',
    gap = 24,
    fade = 24,
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
    const start = useReducedMotion() ? 'hover' : trigger;

    const isLoop = mode !== 'bounce';
    const overflow = sizes.content - sizes.box;
    // Browsers round sub-pixel widths differently, so content within half a pixel of the box fits.
    const fits = overflow <= 0.5;
    const canMove = isLoop && scroll === 'always' ? sizes.content > 0 : !fits;
    const moving = canMove && (start === 'auto' || engaged);
    const copies = isLoop && canMove ? countCopies(sizes.box, sizes.item) : 0;
    const distance = isLoop ? sizes.item : Math.max(overflow, 0);
    const pause = rest / 1000;
    const duration = distance / speed + pause;
    const easing = restEasing(mode, duration > 0 ? pause / duration : 0);

    useLayoutEffect(() => {
        const root = rootRef.current;
        const item = trackRef.current?.firstElementChild;
        const content = item?.firstElementChild;
        if (!root || !item || !content) return;

        const measure = () => {
            const next = {
                box: root.getBoundingClientRect().width,
                content: content.getBoundingClientRect().width,
                item: item.getBoundingClientRect().width,
            };
            setSizes((previous) => (isSame(previous, next) ? previous : next));
        };
        const observer = new ResizeObserver(measure);
        for (const element of [root, item, content]) observer.observe(element);
        return () => observer.disconnect();
    }, []);

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

    useEffect(() => {
        const root = rootRef.current;
        const track = trackRef.current;
        if (!root || !track || copies === 0) return;

        const ranges = new Set<Range>();
        const hover = (event: PointerEvent) => {
            const target =
                event.type === 'pointerout'
                    ? event.relatedTarget
                    : event.target;
            markMatches(track, target, 'data-hover');
        };
        const press = (event: PointerEvent) => {
            const target = event.type === 'pointerdown' ? event.target : null;
            markMatches(track, target, 'data-active');
        };
        const select = () => {
            root.toggleAttribute(
                'data-selecting',
                mirrorSelection(track, ranges)
            );
        };
        const observer = new MutationObserver(() => hideCopies(track));

        hideCopies(track);
        observer.observe(track, { childList: true, subtree: true });
        track.addEventListener('pointerover', hover);
        track.addEventListener('pointerout', hover);
        track.addEventListener('pointerdown', press);
        window.addEventListener('pointerup', press);
        window.addEventListener('pointercancel', press);
        document.addEventListener('selectionchange', select);
        return () => {
            observer.disconnect();
            track.removeEventListener('pointerover', hover);
            track.removeEventListener('pointerout', hover);
            track.removeEventListener('pointerdown', press);
            window.removeEventListener('pointerup', press);
            window.removeEventListener('pointercancel', press);
            document.removeEventListener('selectionchange', select);
            markMatches(track, null, 'data-hover');
            markMatches(track, null, 'data-active');
            clearSelection(ranges);
            root.removeAttribute('data-selecting');
        };
    }, [copies]);

    // A stop leaves the track part way, so it slides back to where the content starts.
    useLayoutEffect(() => {
        const root = rootRef.current;
        const track = trackRef.current;
        const from = rewindFrom.current;
        rewindFrom.current = null;
        if (moving || !root || !track || !from) return;

        // A loop looks the same one item along, so it goes to the nearer of the two.
        const to = isLoop && Math.abs(from) > distance / 2 ? -distance : 0;
        const time = getComputedStyle(root).getPropertyValue(
            '--transition-duration-default'
        );
        track.animate([{ translate: `${from}px` }, { translate: `${to}px` }], {
            duration: toMilliseconds(time),
            easing: 'ease-out',
        });
    }, [moving, isLoop, distance]);

    const engage = () => {
        if (start === 'hover') setEngaged(true);
    };
    const release = () => {
        const track = trackRef.current;
        if (start !== 'hover' || !track) return;
        rewindFrom.current = parseFloat(getComputedStyle(track).translate) || 0;
        setEngaged(false);
    };

    return (
        <FadeBox
            {...props}
            ref={rootRef}
            className={clsx('marquee', className)}
            enabled={!fits || moving}
            depth={fade}
            edges={moving ? ['left', 'right'] : ['right']}
            data-mode={mode}
            data-start={start}
            data-moving={moving || undefined}
            style={{
                '--marquee-distance': `${distance}px`,
                '--marquee-duration': `${duration}s`,
                '--marquee-easing': easing,
                '--marquee-gap': toCssSize(gap),
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
                            <div data-part="separator" aria-hidden>
                                {separator}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </FadeBox>
    );
}

function isSame(a: Sizes, b: Sizes) {
    return a.box === b.box && a.content === b.content && a.item === b.item;
}
