import {
    useRef,
    type ComponentPropsWithoutRef,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import clsx from 'clsx';

import {
    clamp,
    type CssDimension,
    type MinMax,
    type Size,
} from '@/shared/geometry';

export const RESIZE_EDGES = [
    'top',
    'right',
    'bottom',
    'left',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
] as const;

export type ResizeEdge = (typeof RESIZE_EDGES)[number];

const DEFAULT_RANGE = {
    width: { min: 0, max: Number.POSITIVE_INFINITY },
    height: { min: 0, max: Number.POSITIVE_INFINITY },
} satisfies Size<MinMax<number>>;

const edgeClass = {
    top: 'top-0 right-3 left-3 h-1.5 cursor-ns-resize',
    right: 'top-3 right-0 bottom-3 w-1.5 cursor-ew-resize',
    bottom: 'right-3 bottom-0 left-3 h-1.5 cursor-ns-resize',
    left: 'top-3 bottom-3 left-0 w-1.5 cursor-ew-resize',
    'top-left': 'top-0 left-0 size-3 cursor-nwse-resize',
    'top-right': 'top-0 right-0 size-3 cursor-nesw-resize',
    'bottom-left': 'bottom-0 left-0 size-3 cursor-nesw-resize',
    'bottom-right': 'right-0 bottom-0 size-3 cursor-nwse-resize',
} satisfies Record<ResizeEdge, string>;

function resizesWidth(edge: ResizeEdge) {
    return edge === 'left' || edge === 'right' || edge.includes('left') || edge.includes('right');
}

function resizesHeight(edge: ResizeEdge) {
    return edge === 'top' || edge === 'bottom' || edge.includes('top') || edge.includes('bottom');
}

function resizesFromLeft(edge: ResizeEdge) {
    return edge === 'left' || edge === 'top-left' || edge === 'bottom-left';
}

function resizesFromRight(edge: ResizeEdge) {
    return edge === 'right' || edge === 'top-right' || edge === 'bottom-right';
}

function resizesFromTop(edge: ResizeEdge) {
    return edge === 'top' || edge === 'top-left' || edge === 'top-right';
}

function resizesFromBottom(edge: ResizeEdge) {
    return edge === 'bottom' || edge === 'bottom-left' || edge === 'bottom-right';
}

export function resizeSize<T extends CssDimension>(
    start: Size<T>,
    delta: Size<number>,
    edge: ResizeEdge,
    range: Size<MinMax<number>>
): Size<T> {
    const next: Size<CssDimension> = { ...start };

    if (typeof start.width === 'number') {
        if (resizesFromLeft(edge)) {
            next.width = clamp(start.width - delta.width, range.width);
        } else if (resizesFromRight(edge)) {
            next.width = clamp(start.width + delta.width, range.width);
        }
    }

    if (typeof start.height === 'number') {
        if (resizesFromTop(edge)) {
            next.height = clamp(start.height - delta.height, range.height);
        } else if (resizesFromBottom(edge)) {
            next.height = clamp(start.height + delta.height, range.height);
        }
    }

    return next as Size<T>;
}

type ResizeHandleProps = {
    edge: ResizeEdge;
    onResizeStart: (edge: ResizeEdge) => void;
    onResize: (edge: ResizeEdge, delta: Size<number>) => void;
    onResizeEnd: (edge: ResizeEdge) => void;
};

function ResizeHandle({
    edge,
    onResizeStart,
    onResize,
    onResizeEnd,
}: ResizeHandleProps) {
    const drag = useRef<{
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);

    const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current || drag.current.pointerId !== event.pointerId) return;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        drag.current = null;
        onResizeEnd(edge);
    };

    return (
        <div
            aria-hidden="true"
            data-resize-edge={edge}
            className={clsx(
                'absolute z-50 touch-none select-none',
                edgeClass[edge]
            )}
            onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                };
                onResizeStart(edge);
            }}
            onPointerMove={(event) => {
                const start = drag.current;
                if (!start || start.pointerId !== event.pointerId) return;

                onResize(edge, {
                    width: event.clientX - start.x,
                    height: event.clientY - start.y,
                });
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
        />
    );
}

export type ResizableProps<T extends CssDimension = CssDimension> = Omit<
    ComponentPropsWithoutRef<'div'>,
    'onResize'
> & {
    size: Size<T>;
    range?: Partial<Size<MinMax<number>>>;
    edges?: readonly ResizeEdge[];
    onResize: (size: Size<T>, edge: ResizeEdge) => void;
    onResizeStart?: (edge: ResizeEdge) => void;
    onResizeEnd?: (size: Size<T>, edge: ResizeEdge) => void;
};

export function Resizable<T extends CssDimension>({
    size,
    range,
    edges = RESIZE_EDGES,
    onResize,
    onResizeStart,
    onResizeEnd,
    className,
    style,
    children,
    ...props
}: ResizableProps<T>) {
    const startSize = useRef(size);
    const latestSize = useRef(size);
    const resolvedRange = {
        width: range?.width ?? DEFAULT_RANGE.width,
        height: range?.height ?? DEFAULT_RANGE.height,
    } satisfies Size<MinMax<number>>;

    const canUseEdge = (edge: ResizeEdge) => {
        const needsWidth = resizesWidth(edge);
        const needsHeight = resizesHeight(edge);

        if (needsWidth && needsHeight) {
            return typeof size.width === 'number' && typeof size.height === 'number';
        }

        if (needsWidth) return typeof size.width === 'number';
        if (needsHeight) return typeof size.height === 'number';
        return false;
    };

    return (
        <div
            {...props}
            className={clsx('relative', className)}
            style={{
                ...style,
                width: size.width,
                height: size.height,
            }}
        >
            {children}

            {edges.filter(canUseEdge).map((edge) => (
                <ResizeHandle
                    key={edge}
                    edge={edge}
                    onResizeStart={(activeEdge) => {
                        startSize.current = size;
                        latestSize.current = size;
                        onResizeStart?.(activeEdge);
                    }}
                    onResize={(activeEdge, delta) => {
                        const next = resizeSize(
                            startSize.current,
                            delta,
                            activeEdge,
                            resolvedRange
                        );
                        latestSize.current = next;
                        onResize(next, activeEdge);
                    }}
                    onResizeEnd={(activeEdge) => {
                        onResizeEnd?.(latestSize.current, activeEdge);
                    }}
                />
            ))}
        </div>
    );
}
