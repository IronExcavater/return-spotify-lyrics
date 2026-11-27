import {
    GripCorner,
    GripHorizontal,
    GripVertical,
} from '@return-spotify-lyrics/icons';
import {
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type KeyboardEvent,
    type PointerEvent,
} from 'react';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../../helpers/css';
import {
    findAxisRange,
    fitCorner,
    fitSize,
    orderRatios,
    resolveEdges,
    type Axis,
    type EdgeSet,
    type Edge,
    type EdgeVector,
    type Point,
    type Size,
    type SizeLimits,
} from '../../helpers/geometry';

export type HandlePlacement = 'overlap' | 'inset';

/** When a resize goes past an aspect ratio, the axis that the handle does not move follows it. */
export type ResizeBoxProps = Omit<
    ComponentPropsWithoutRef<'div'>,
    'onChange' | 'defaultValue'
> &
    SizeLimits & {
        /** The size in pixels, for a box that the parent controls. A new value moves the box to it. */
        value?: Size | undefined;
        /** The size in pixels at first, for a box that keeps its own size. */
        defaultValue?: Size;
        /** The edges that get a handle: `all`, `none` or a list of sides and corners. */
        edges?: EdgeSet;
        /** Show a grip icon on each handle. */
        showGrip?: boolean;
        /** How wide each handle is. */
        handleSize?: CssLength;
        /** Put the handles over the content, or in a padding around it. */
        handlePlacement?: HandlePlacement;
        /** Arrow key step in pixels. Shift moves five steps. */
        keyStep?: number;
        /** Accessible name for each handle. */
        getHandleLabel?: (edge: Edge) => string;
        /** Called for each size change during a resize. */
        onValueChange?: (value: Size) => void;
        /** Called once when a resize ends, so the caller can save the size. */
        onValueCommitted?: (value: Size) => void;
    };

type Drag = {
    edge: EdgeVector;
    pointerId: number;
    start: Point;
    from: Size;
    limits: SizeLimits;
    last: Size;
};

const DEFAULT_SIZE: Size = { width: 320, height: 200 };

// A length that no real bound reaches, so a probe of this length finds the largest size that CSS allows.
const PROBE_LENGTH = 100_000;

const ARROW_KEYS: Record<string, Point> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

const nameHandle = (edge: Edge) => `Resize ${edge.replace('-', ' ')}`;

/**
 * A box that a person resizes from handles on its edges, with a pointer or the arrow keys. A resize stops at the
 * content's smallest size and at the parent's edge, and an aspect ratio holds exactly in every browser. To let the
 * box grow past its parent, give it `max-w-none` or `max-h-none`. To let it shrink past its content, like content
 * that scrolls, give it `contain-size`.
 */
export default function ResizeBox({
    value,
    defaultValue = DEFAULT_SIZE,
    minSize,
    maxSize,
    minAspectRatio,
    maxAspectRatio,
    edges = 'all',
    showGrip = true,
    handleSize = 14,
    handlePlacement = 'overlap',
    keyStep = 10,
    getHandleLabel = nameHandle,
    onValueChange,
    onValueCommitted,
    className,
    style,
    children,
    ...props
}: ResizeBoxProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag | null>(null);
    const [ownValue, setOwnValue] = useState(defaultValue);
    // The size during a resize shows at once, even when the parent sets its value later.
    const [liveSize, setLiveSize] = useState<Size | null>(null);
    const [dragEdge, setDragEdge] = useState<Edge | null>(null);

    const handles = resolveEdges(edges);
    const limits = orderRatios({
        minSize,
        maxSize,
        minAspectRatio,
        maxAspectRatio,
    });
    // The props can change the limits at any time, so each render fits the size again.
    const fitted = fitSize(liveSize ?? value ?? ownValue, 'width', limits);

    // The box must hold one handle and its content, and stay inside its parent, so those join the limits.
    const limitsFor = (handle: HTMLElement): SizeLimits => {
        const box = boxRef.current;
        if (!box) return limits;

        const bounds = measureBounds(box, fitted);
        const { width, height } = handle.getBoundingClientRect();
        const thickness = Math.min(width, height);
        return {
            ...limits,
            minSize: {
                width: Math.max(
                    limits.minSize?.width ?? 0,
                    thickness,
                    bounds.min.width
                ),
                height: Math.max(
                    limits.minSize?.height ?? 0,
                    thickness,
                    bounds.min.height
                ),
            },
            maxSize: {
                width: Math.min(
                    limits.maxSize?.width ?? Infinity,
                    bounds.max.width
                ),
                height: Math.min(
                    limits.maxSize?.height ?? Infinity,
                    bounds.max.height
                ),
            },
        };
    };

    const resize = (
        edge: EdgeVector,
        from: Size,
        delta: Point,
        resizeLimits: SizeLimits
    ): Size => {
        const requested = {
            width: from.width + delta.x * edge.x,
            height: from.height + delta.y * edge.y,
        };
        // A corner moves both axes, and a side moves one axis that leads while the other follows.
        const isCorner = edge.x !== 0 && edge.y !== 0;
        const next = isCorner
            ? fitCorner(requested, resizeLimits)
            : fitSize(requested, edge.x ? 'width' : 'height', resizeLimits);
        setLiveSize(next);
        onValueChange?.(next);
        return next;
    };

    const commit = (size: Size) => {
        setOwnValue(size);
        setLiveSize(null);
        onValueCommitted?.(size);
    };

    const startDrag = (
        event: PointerEvent<HTMLDivElement>,
        edge: EdgeVector
    ) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        // A popup window moves its left edge as it grows, so page coordinates move but screen coordinates do not.
        drag.current = {
            edge,
            pointerId: event.pointerId,
            start: { x: event.screenX, y: event.screenY },
            from: fitted,
            limits: limitsFor(event.currentTarget),
            last: fitted,
        };
        setDragEdge(edge.name);
    };

    // The delta is from the drag start, so the edge stays under the pointer after a limit.
    const moveDrag = (event: PointerEvent) => {
        const active = drag.current;
        if (active?.pointerId !== event.pointerId) return;

        const delta = {
            x: event.screenX - active.start.x,
            y: event.screenY - active.start.y,
        };
        active.last = resize(active.edge, active.from, delta, active.limits);
    };

    const endDrag = () => {
        const active = drag.current;
        if (!active) return;

        drag.current = null;
        setDragEdge(null);
        commit(active.last);
    };

    const resizeWithKey = (
        event: KeyboardEvent<HTMLDivElement>,
        edge: EdgeVector
    ) => {
        const arrow = ARROW_KEYS[event.key];
        if (!arrow) return;

        const movesEdge =
            (arrow.x !== 0 && edge.x !== 0) || (arrow.y !== 0 && edge.y !== 0);
        if (!movesEdge) return;

        event.preventDefault();
        const distance = event.shiftKey ? keyStep * 5 : keyStep;
        const delta = { x: arrow.x * distance, y: arrow.y * distance };
        commit(resize(edge, fitted, delta, limitsFor(event.currentTarget)));
    };

    return (
        <div
            {...props}
            ref={boxRef}
            className={clsx('resize-box', className)}
            data-placement={handlePlacement}
            style={{
                ...style,
                ...fitted,
                '--handle-thickness': toCssSize(handleSize),
            }}
        >
            <div data-part="content">{children}</div>

            {handles.map((edge) => {
                const Grip = gripIcon(edge);
                return (
                    <div
                        key={edge.name}
                        role="separator"
                        tabIndex={0}
                        aria-label={getHandleLabel(edge.name)}
                        {...separatorAria(edge, fitted, limits)}
                        data-part="handle"
                        data-edge={edge.name}
                        data-dragging={dragEdge === edge.name || undefined}
                        onPointerDown={(event) => startDrag(event, edge)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onLostPointerCapture={endDrag}
                        onKeyDown={(event) => resizeWithKey(event, edge)}
                    >
                        {showGrip && <Grip aria-hidden data-part="grip" />}
                    </div>
                );
            })}
        </div>
    );
}

// ponytail: content height comes from the start width, so text that wraps more is cut; set minSize for it.
// The CSS bounds apply only while this reads them, so they never push the box out of a ratio.
function measureBounds(box: HTMLElement, from: Size): { min: Size; max: Size } {
    const saved = box.style.cssText;
    const lengthWith = (axis: Axis, length: string) => {
        box.style.cssText = saved;
        box.style[axis] = length;
        return box.getBoundingClientRect()[axis];
    };

    box.dataset.measuring = '';
    // Firefox ignores min-content in a height, and auto gives the same height for this box.
    const min = {
        width: lengthWith('width', 'min-content'),
        height: lengthWith('height', 'auto'),
    };
    const max = {
        width: lengthWith('width', `${PROBE_LENGTH}px`),
        height: lengthWith('height', `${PROBE_LENGTH}px`),
    };
    box.style.cssText = saved;
    delete box.dataset.measuring;

    // A probe that CSS doesn't stop means no bound, and a bound never moves the box when a resize starts.
    const toMax = (length: number, current: number) =>
        length < PROBE_LENGTH ? Math.max(length, current) : Infinity;
    return {
        min: {
            width: Math.min(min.width, from.width),
            height: Math.min(min.height, from.height),
        },
        max: {
            width: toMax(max.width, from.width),
            height: toMax(max.height, from.height),
        },
    };
}

// Handles follow the ARIA window splitter pattern.
function separatorAria(edge: EdgeVector, size: Size, limits: SizeLimits) {
    const axis = edge.x ? 'width' : 'height';
    const [min, max] = findAxisRange(axis, limits);
    // A separator takes one value, so a corner gives its width as the value and both sides as text.
    const isCorner = edge.x !== 0 && edge.y !== 0;
    return {
        'aria-orientation': edge.x ? 'vertical' : 'horizontal',
        'aria-valuenow': Math.round(size[axis]),
        'aria-valuemin': Math.round(min),
        'aria-valuemax': Number.isFinite(max) ? Math.round(max) : undefined,
        'aria-valuetext': isCorner
            ? `${Math.round(size.width)} by ${Math.round(size.height)}`
            : undefined,
    } as const;
}

function gripIcon(edge: EdgeVector) {
    if (edge.x && edge.y) return GripCorner;
    if (edge.y) return GripHorizontal;
    return GripVertical;
}
