import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import clsx from 'clsx';

export const RESIZE_HANDLES = [
    'top',
    'right',
    'bottom',
    'left',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
] as const;

export type ResizeHandle = (typeof RESIZE_HANDLES)[number];
export type ResizeMode = 'both' | 'horizontal' | 'vertical' | false;

type Dimensions = {
    width: number | string;
    height: number | string;
};

type StoredDimensions = {
    width: number;
    height: number;
};

const handleClass = {
    top: 'top-0 right-3 left-3 h-1.5 cursor-ns-resize',
    right: 'top-3 right-0 bottom-3 w-1.5 cursor-ew-resize',
    bottom: 'right-3 bottom-0 left-3 h-1.5 cursor-ns-resize',
    left: 'top-3 bottom-3 left-0 w-1.5 cursor-ew-resize',
    'top-left': 'top-0 left-0 size-3 cursor-nwse-resize',
    'top-right': 'top-0 right-0 size-3 cursor-nesw-resize',
    'bottom-left': 'bottom-0 left-0 size-3 cursor-nesw-resize',
    'bottom-right': 'right-0 bottom-0 size-3 cursor-nwse-resize',
} satisfies Record<ResizeHandle, string>;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function usesWidth(handle: ResizeHandle) {
    return handle.includes('left') || handle.includes('right');
}

function usesHeight(handle: ResizeHandle) {
    return handle.includes('top') || handle.includes('bottom');
}

function fromLeft(handle: ResizeHandle) {
    return (
        handle === 'left' || handle === 'top-left' || handle === 'bottom-left'
    );
}

function fromRight(handle: ResizeHandle) {
    return (
        handle === 'right' ||
        handle === 'top-right' ||
        handle === 'bottom-right'
    );
}

function fromTop(handle: ResizeHandle) {
    return handle === 'top' || handle === 'top-left' || handle === 'top-right';
}

function fromBottom(handle: ResizeHandle) {
    return (
        handle === 'bottom' ||
        handle === 'bottom-left' ||
        handle === 'bottom-right'
    );
}

function resizesWidth(mode: ResizeMode) {
    return mode === 'both' || mode === 'horizontal';
}

function resizesHeight(mode: ResizeMode) {
    return mode === 'both' || mode === 'vertical';
}

export function resolveResizeHandles(
    width: number | string,
    height: number | string,
    resize: ResizeMode = 'both',
    handles: readonly ResizeHandle[] = RESIZE_HANDLES
): ResizeHandle[] {
    return handles.filter((handle) => {
        if (
            usesWidth(handle) &&
            (!resizesWidth(resize) || typeof width !== 'number')
        ) {
            return false;
        }

        if (
            usesHeight(handle) &&
            (!resizesHeight(resize) || typeof height !== 'number')
        ) {
            return false;
        }

        return true;
    });
}

export function resizeDimensions(
    start: Dimensions,
    deltaX: number,
    deltaY: number,
    handle: ResizeHandle,
    minWidth = 0,
    maxWidth = Number.POSITIVE_INFINITY,
    minHeight = 0,
    maxHeight = Number.POSITIVE_INFINITY
): Dimensions {
    const next = { ...start };

    if (typeof start.width === 'number') {
        if (fromLeft(handle)) {
            next.width = clamp(start.width - deltaX, minWidth, maxWidth);
        } else if (fromRight(handle)) {
            next.width = clamp(start.width + deltaX, minWidth, maxWidth);
        }
    }

    if (typeof start.height === 'number') {
        if (fromTop(handle)) {
            next.height = clamp(start.height - deltaY, minHeight, maxHeight);
        } else if (fromBottom(handle)) {
            next.height = clamp(start.height + deltaY, minHeight, maxHeight);
        }
    }

    return next;
}

export function mergeStoredDimensions(
    stored: StoredDimensions,
    resized: Dimensions,
    remember: ResizeMode = 'both'
): StoredDimensions {
    return {
        width:
            resizesWidth(remember) && typeof resized.width === 'number'
                ? resized.width
                : stored.width,
        height:
            resizesHeight(remember) && typeof resized.height === 'number'
                ? resized.height
                : stored.height,
    };
}

function applyDocumentSize({ width, height }: Dimensions) {
    const cssWidth = typeof width === 'number' ? `${width}px` : width;
    const cssHeight = typeof height === 'number' ? `${height}px` : height;

    document.documentElement.style.width = cssWidth;
    document.documentElement.style.height = cssHeight;
    document.body.style.width = cssWidth;
    document.body.style.height = cssHeight;
}

function clearDocumentSize() {
    document.documentElement.style.removeProperty('width');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
}

type HandleProps = {
    handle: ResizeHandle;
    onStart: (handle: ResizeHandle) => void;
    onMove: (handle: ResizeHandle, deltaX: number, deltaY: number) => void;
    onEnd: (handle: ResizeHandle) => void;
};

function Handle({ handle, onStart, onMove, onEnd }: HandleProps) {
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
        onEnd(handle);
    };

    return (
        <div
            aria-hidden="true"
            data-resize-handle={handle}
            className={clsx(
                'absolute z-50 touch-none select-none',
                handleClass[handle]
            )}
            onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                };
                onStart(handle);
            }}
            onPointerMove={(event) => {
                const start = drag.current;
                if (!start || start.pointerId !== event.pointerId) return;

                onMove(
                    handle,
                    event.clientX - start.x,
                    event.clientY - start.y
                );
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
    width: number | string;
    height: number | string;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    resize?: ResizeMode;
    handles?: readonly ResizeHandle[];
    target?: 'self' | 'document';
    storage?: {
        getValue: () => Promise<StoredDimensions>;
        setValue: (value: StoredDimensions) => Promise<void>;
    };
    remember?: ResizeMode;
    onResize?: (dimensions: Dimensions, handle: ResizeHandle) => void;
    onResizeStart?: (handle: ResizeHandle) => void;
    onResizeEnd?: (dimensions: Dimensions, handle: ResizeHandle) => void;
};

export function Resizable({
    width,
    height,
    minWidth = 0,
    maxWidth = Number.POSITIVE_INFINITY,
    minHeight = 0,
    maxHeight = Number.POSITIVE_INFINITY,
    resize = 'both',
    handles,
    target = 'self',
    storage,
    remember = 'both',
    onResize,
    onResizeStart,
    onResizeEnd,
    className,
    style,
    children,
    ...props
}: ResizableProps) {
    const [dimensions, setDimensions] = useState<Dimensions>({ width, height });
    const start = useRef<Dimensions>({ width, height });
    const latest = useRef<Dimensions>({ width, height });

    useEffect(() => {
        const next = { width, height };
        setDimensions(next);
        latest.current = next;
    }, [height, width]);

    useLayoutEffect(() => {
        if (target !== 'document') return;

        applyDocumentSize(dimensions);
        return clearDocumentSize;
    }, [dimensions, target]);

    const activeHandles = resolveResizeHandles(
        dimensions.width,
        dimensions.height,
        resize,
        handles
    );

    const persist = async (next: Dimensions) => {
        if (!storage || remember === false) return;

        const stored = await storage.getValue();
        await storage.setValue(mergeStoredDimensions(stored, next, remember));
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
                          width: dimensions.width,
                          height: dimensions.height,
                      }
                    : style
            }
        >
            {children}

            {activeHandles.map((handle) => (
                <Handle
                    key={handle}
                    handle={handle}
                    onStart={(activeHandle) => {
                        start.current = dimensions;
                        latest.current = dimensions;
                        onResizeStart?.(activeHandle);
                    }}
                    onMove={(activeHandle, deltaX, deltaY) => {
                        const next = resizeDimensions(
                            start.current,
                            deltaX,
                            deltaY,
                            activeHandle,
                            minWidth,
                            maxWidth,
                            minHeight,
                            maxHeight
                        );
                        latest.current = next;
                        setDimensions(next);
                        onResize?.(next, activeHandle);
                    }}
                    onEnd={(activeHandle) => {
                        const next = latest.current;
                        void persist(next);
                        onResizeEnd?.(next, activeHandle);
                    }}
                />
            ))}
        </div>
    );
}
