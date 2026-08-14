import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
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
export type ResizableSize = Size<CssDimension>;
export type ResizeAxes = boolean | Partial<Size<boolean>>;
export type ResizeTarget = 'self' | 'document';

export type SizeStorage = {
    getValue: () => Promise<Size<number>>;
    setValue: (value: Size<number>) => Promise<void>;
};

export type ResizePersistence = {
    storage: SizeStorage;
    dimensions?: Partial<Size<boolean>>;
};

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
    return edge.includes('left') || edge.includes('right');
}

function resizesHeight(edge: ResizeEdge) {
    return edge.includes('top') || edge.includes('bottom');
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

function normalizeAxes(resize: ResizeAxes): Size<boolean> {
    if (typeof resize === 'boolean') {
        return { width: resize, height: resize };
    }

    return {
        width: resize.width ?? false,
        height: resize.height ?? false,
    };
}

export function resolveResizeEdges(
    size: ResizableSize,
    resize: ResizeAxes = true,
    edges: readonly ResizeEdge[] = RESIZE_EDGES
): ResizeEdge[] {
    const axes = normalizeAxes(resize);

    return edges.filter((edge) => {
        const needsWidth = resizesWidth(edge);
        const needsHeight = resizesHeight(edge);

        if (needsWidth && (!axes.width || typeof size.width !== 'number')) {
            return false;
        }

        if (needsHeight && (!axes.height || typeof size.height !== 'number')) {
            return false;
        }

        return true;
    });
}

export function resizeSize(
    start: ResizableSize,
    delta: Size<number>,
    edge: ResizeEdge,
    range: Size<MinMax<number>>
): ResizableSize {
    const next = { ...start };

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

    return next;
}

export function mergePersistedSize(
    remembered: Size<number>,
    resized: ResizableSize,
    dimensions: Partial<Size<boolean>> = { width: true, height: true }
): Size<number> {
    return {
        width:
            dimensions.width !== false && typeof resized.width === 'number'
                ? resized.width
                : remembered.width,
        height:
            dimensions.height !== false && typeof resized.height === 'number'
                ? resized.height
                : remembered.height,
    };
}

function applyDocumentSize(size: ResizableSize) {
    const width =
        typeof size.width === 'number' ? `${size.width}px` : size.width;
    const height =
        typeof size.height === 'number' ? `${size.height}px` : size.height;

    document.documentElement.style.width = width;
    document.documentElement.style.height = height;
    document.body.style.width = width;
    document.body.style.height = height;
}

function clearDocumentSize() {
    document.documentElement.style.removeProperty('width');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
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

export type ResizableProps = Omit<
    ComponentPropsWithoutRef<'div'>,
    'onResize'
> & {
    size: ResizableSize;
    range?: Partial<Size<MinMax<number>>>;
    resize?: ResizeAxes;
    edges?: readonly ResizeEdge[];
    target?: ResizeTarget;
    persistence?: ResizePersistence;
    onResize?: (size: ResizableSize, edge: ResizeEdge) => void;
    onResizeStart?: (edge: ResizeEdge) => void;
    onResizeEnd?: (size: ResizableSize, edge: ResizeEdge) => void;
};

export function Resizable({
    size,
    range,
    resize = true,
    edges,
    target = 'self',
    persistence,
    onResize,
    onResizeStart,
    onResizeEnd,
    className,
    style,
    children,
    ...props
}: ResizableProps) {
    const [currentSize, setCurrentSize] = useState<ResizableSize>(size);
    const startSize = useRef<ResizableSize>(size);
    const latestSize = useRef<ResizableSize>(size);

    const resolvedRange = {
        width: range?.width ?? DEFAULT_RANGE.width,
        height: range?.height ?? DEFAULT_RANGE.height,
    } satisfies Size<MinMax<number>>;

    useEffect(() => {
        setCurrentSize(size);
        latestSize.current = size;
    }, [size.height, size.width]);

    useLayoutEffect(() => {
        if (target !== 'document') return;

        applyDocumentSize(currentSize);
        return clearDocumentSize;
    }, [currentSize, target]);

    const activeEdges = resolveResizeEdges(currentSize, resize, edges);

    const persist = async (next: ResizableSize) => {
        if (!persistence) return;

        const remembered = await persistence.storage.getValue();
        await persistence.storage.setValue(
            mergePersistedSize(remembered, next, persistence.dimensions)
        );
    };

    return (
        <div
            {...props}
            className={clsx(
                'relative',
                target === 'document' && 'h-full w-full',
                className
            )}
            style={
                target === 'self'
                    ? {
                          ...style,
                          width: currentSize.width,
                          height: currentSize.height,
                      }
                    : style
            }
        >
            {children}

            {activeEdges.map((edge) => (
                <ResizeHandle
                    key={edge}
                    edge={edge}
                    onResizeStart={(activeEdge) => {
                        startSize.current = currentSize;
                        latestSize.current = currentSize;
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
                        setCurrentSize(next);
                        onResize?.(next, activeEdge);
                    }}
                    onResizeEnd={(activeEdge) => {
                        const next = latestSize.current;
                        void persist(next);
                        onResizeEnd?.(next, activeEdge);
                    }}
                />
            ))}
        </div>
    );
}
