import {
    GripCorner,
    GripHorizontal,
    GripVertical,
} from '@return-spotify-lyrics/icons';
import {
    useEffect,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type KeyboardEvent,
    type PointerEvent,
} from 'react';
import { flushSync } from 'react-dom';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../css';
import {
    axisRange,
    fitSize,
    keepsAspectRatio,
    resolveEdges,
    type Axis,
    type Direction,
    type Edge,
    type EdgeInfo,
    type Point,
    type Size,
    type SizeLimits,
} from '../geometry';

export type HandlePlacement = 'overlap' | 'inset';

/** When a resize goes past an aspect ratio, the axis that the handle does not move follows it. */
export type ResizeBoxProps = Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> &
    SizeLimits & {
        size: Size;
        direction?: Direction;
        showIndicator?: boolean;
        thickness?: CssLength;
        placement?: HandlePlacement;
        /** Arrow key step in pixels. Shift moves five steps. */
        step?: number;
        /** Accessible name for each handle. */
        handleLabel?: (edge: Edge) => string;
        /** Called for each size change during a resize. */
        onChange?: (size: Size) => void;
        /** Called once when a resize ends, so the caller can save the size. */
        onChangeEnd?: (size: Size) => void;
    };

type Drag = {
    edge: EdgeInfo;
    pointerId: number;
    start: Point;
    from: Size;
};

const ARROW_KEYS: Record<string, Point> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

const defaultHandleLabel = (edge: Edge) => `Resize ${edge.replace('-', ' ')}`;

export default function ResizeBox({
    size,
    minSize,
    maxSize,
    minAspectRatio,
    maxAspectRatio,
    direction = 'all',
    showIndicator = true,
    thickness = 14,
    placement = 'overlap',
    step = 10,
    handleLabel = defaultHandleLabel,
    onChange,
    onChangeEnd,
    className,
    style,
    children,
    ...props
}: ResizeBoxProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag | null>(null);
    const [current, setCurrent] = useState<Size>(size);
    const [dragEdge, setDragEdge] = useState<Edge | null>(null);

    useEffect(
        () => setCurrent({ width: size.width, height: size.height }),
        [size.width, size.height]
    );

    const edges = resolveEdges(direction);
    const limits = { minSize, maxSize, minAspectRatio, maxAspectRatio };
    // The props can change the limits after a resize, so each render fits the size again.
    const fitted = fitSize(current, 'width', limits);

    // Handles exist only while the box is mounted, so the ref is always set here.
    const renderedSize = (): Size => {
        const { width, height } = boxRef.current!.getBoundingClientRect();
        return { width, height };
    };

    // Sets a size, then checks that the browser draws it inside the aspect ratios.
    const tryResize = (size: Size) => {
        flushSync(() => setCurrent(size));
        return keepsAspectRatio(renderedSize(), limits);
    };

    const resize = (edge: EdgeInfo, from: Size, delta: Point) => {
        const lead = leadAxis(edge, from, delta);
        const requested = {
            width: from.width + delta.x * edge.x,
            height: from.height + delta.y * edge.y,
        };
        // Step 0 is the requested size, and step 1 is the last size, which keeps the ratios.
        const sizeAt = (step: number) =>
            fitSize(mixSize(requested, fitted, step), lead, limits);

        // CSS can grow an axis to fit the content, so a size that breaks a ratio moves back.
        if (!tryResize(sizeAt(0))) {
            tryResize(sizeAt(findStep((step) => tryResize(sizeAt(step)))));
        }

        onChange?.(renderedSize());
    };

    const endResize = () => onChangeEnd?.(renderedSize());

    const startDrag = (event: PointerEvent<HTMLDivElement>, edge: EdgeInfo) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        // A popup window moves its left edge as it grows, so page coordinates move but screen coordinates do not.
        const start = { x: event.screenX, y: event.screenY };
        drag.current = {
            edge,
            pointerId: event.pointerId,
            start,
            from: renderedSize(),
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
        resize(active.edge, active.from, delta);
    };

    const endDrag = () => {
        if (!drag.current) return;

        drag.current = null;
        setDragEdge(null);
        endResize();
    };

    const resizeWithKey = (event: KeyboardEvent, edge: EdgeInfo) => {
        const arrow = ARROW_KEYS[event.key];
        if (!arrow) return;

        const movesEdge =
            (arrow.x !== 0 && edge.x !== 0) || (arrow.y !== 0 && edge.y !== 0);
        if (!movesEdge) return;

        event.preventDefault();
        const distance = event.shiftKey ? step * 5 : step;
        const delta = { x: arrow.x * distance, y: arrow.y * distance };
        resize(edge, renderedSize(), delta);
        endResize();
    };

    return (
        <div
            {...props}
            ref={boxRef}
            className={clsx('resize-box', className)}
            data-placement={placement}
            style={{
                ...style,
                ...fitted,
                '--handle-thickness': toCssSize(thickness),
            }}
        >
            <div data-part="content">{children}</div>

            {edges.map((edge) => {
                const Grip = gripIcon(edge);
                return (
                    <div
                        key={edge.name}
                        role="separator"
                        tabIndex={0}
                        aria-label={handleLabel(edge.name)}
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
                        {showIndicator && <Grip aria-hidden data-part="grip" />}
                    </div>
                );
            })}
        </div>
    );
}

// Handles follow the ARIA window splitter pattern.
function separatorAria(edge: EdgeInfo, size: Size, limits: SizeLimits) {
    const axis = edge.x ? 'width' : 'height';
    const [min, max] = axisRange(axis, limits);
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

// A corner moves both axes, so the axis that moves more, for its size, leads.
function leadAxis(edge: EdgeInfo, from: Size, delta: Point): Axis {
    if (!edge.y) return 'width';
    if (!edge.x) return 'height';

    const widthChange = Math.abs(delta.x / from.width);
    const heightChange = Math.abs(delta.y / from.height);
    return widthChange >= heightChange ? 'width' : 'height';
}

function mixSize(from: Size, to: Size, step: number): Size {
    return {
        width: from.width + (to.width - from.width) * step,
        height: from.height + (to.height - from.height) * step,
    };
}

// A binary search for the lowest step that passes, when step 0 fails and step 1 passes.
function findStep(passes: (step: number) => boolean): number {
    let fail = 0;
    let pass = 1;
    while (pass - fail > 1 / 256) {
        const middle = (fail + pass) / 2;
        if (passes(middle)) pass = middle;
        else fail = middle;
    }
    return pass;
}

function gripIcon(edge: EdgeInfo) {
    if (edge.x && edge.y) return GripCorner;
    if (edge.y) return GripHorizontal;
    return GripVertical;
}
