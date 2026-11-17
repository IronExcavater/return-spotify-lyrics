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
import { toCssSize, type CssLength } from './css';
import {
    clampSize,
    resolveEdges,
    type Direction,
    type Edge,
    type EdgeInfo,
    type Point,
    type Size,
} from './geometry';

export type HandlePlacement = 'overlap' | 'inset';

export type ResizeBoxProps = Omit<
    ComponentPropsWithoutRef<'div'>,
    'onChange'
> & {
    size: Size;
    minSize?: Partial<Size>;
    maxSize?: Partial<Size>;
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
    minSize = {},
    maxSize = {},
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

    // Handles exist only while the box is mounted, so the ref is always set here.
    const renderedSize = (): Size => {
        const { width, height } = boxRef.current!.getBoundingClientRect();
        return { width, height };
    };

    // CSS can stop the box before the requested size, so report the size that the browser draws.
    const resize = ({ x, y }: EdgeInfo, from: Size, delta: Point) => {
        const requested = {
            width: from.width + delta.x * x,
            height: from.height + delta.y * y,
        };
        flushSync(() => setCurrent(clampSize(requested, minSize, maxSize)));
        onChange?.(renderedSize());
    };

    const endResize = () => onChangeEnd?.(renderedSize());

    const startDrag = (event: PointerEvent<HTMLDivElement>, edge: EdgeInfo) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = { x: event.clientX, y: event.clientY };
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
            x: event.clientX - active.start.x,
            y: event.clientY - active.start.y,
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
                ...clampSize(current, minSize, maxSize),
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
                        {...separatorAria(edge, current, minSize, maxSize)}
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

/** Edge handles follow the ARIA window splitter pattern. Corner handles give the size in words. */
function separatorAria(
    edge: EdgeInfo,
    size: Size,
    min: Partial<Size>,
    max: Partial<Size>
) {
    if (edge.x && edge.y) {
        const width = Math.round(size.width);
        const height = Math.round(size.height);
        return { 'aria-valuetext': `${width} by ${height}` };
    }

    const axis = edge.x ? 'width' : 'height';
    const maxValue = max[axis];
    return {
        'aria-orientation': edge.x ? 'vertical' : 'horizontal',
        'aria-valuenow': Math.round(size[axis]),
        'aria-valuemin': Math.round(min[axis] ?? 0),
        'aria-valuemax':
            maxValue === undefined ? undefined : Math.round(maxValue),
    } as const;
}

function gripIcon(edge: EdgeInfo) {
    if (edge.x && edge.y) return GripCorner;
    if (edge.y) return GripHorizontal;
    return GripVertical;
}
