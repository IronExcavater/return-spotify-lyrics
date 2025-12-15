import { ReactNode, RefObject, useEffect, useMemo, useRef } from 'react';

interface WidthConfig {
    value: number;
    min: number;
    max: number;
    override?: number;
}

interface HeightConfig {
    value: number | 'auto';
    min: number | 'auto';
    max: number;
    override?: number | 'auto';
}

interface Props {
    width: WidthConfig;
    height: HeightConfig;
    onWidthChange: (w: number) => void;
    onHeightChange: (h: number) => void;
    children: ReactNode;
}

function applyDimension(
    element: HTMLElement,
    cssProp: 'width' | 'height',
    size: number | 'auto'
) {
    if (size === 'auto') {
        if (cssProp === 'width') {
            element.style.removeProperty(cssProp);
        } else {
            element.style[cssProp] = 'auto';
        }
        return;
    }
    element.style[cssProp] = `${size}px`;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function Resizer({
    width,
    height,
    onWidthChange,
    onHeightChange,
    children,
}: Props) {
    const horizontalRef = useRef<HTMLDivElement>(null);
    const verticalRef = useRef<HTMLDivElement>(null);
    const cornerRef = useRef<HTMLDivElement>(null);

    const resolvedWidth = useMemo(() => {
        return typeof width.override === 'number'
            ? width.override
            : width.value;
    }, [width.override, width.value]);

    const resolvedHeight = useMemo(() => {
        return typeof height.override !== 'undefined'
            ? height.override
            : height.value;
    }, [height.override, height.value]);

    const canResizeWidth = width.override === undefined;
    const canResizeHeight =
        height.override === undefined &&
        typeof resolvedHeight === 'number' &&
        typeof height.min === 'number';

    const widthRef = useRef<number>(resolvedWidth);
    const heightRef = useRef<number>(
        typeof resolvedHeight === 'number' ? resolvedHeight : height.max
    );

    useEffect(() => {
        if (typeof resolvedWidth === 'number') {
            widthRef.current = resolvedWidth;
        }
    }, [resolvedWidth]);

    useEffect(() => {
        if (typeof resolvedHeight === 'number') {
            heightRef.current = resolvedHeight;
        }
    }, [resolvedHeight]);

    useEffect(() => {
        applyDimension(document.body, 'width', resolvedWidth);
    }, [resolvedWidth]);

    useEffect(() => {
        applyDimension(document.body, 'height', resolvedHeight);
    }, [resolvedHeight]);

    const addDragListener = (
        ref: RefObject<HTMLDivElement>,
        onDrag: (dx: number, dy: number) => void
    ) => {
        const el = ref.current;
        if (!el) return;

        const onMouseDown = (downEvt: MouseEvent) => {
            downEvt.preventDefault();
            downEvt.stopPropagation();

            const onMouseMove = (moveEvt: MouseEvent) => {
                moveEvt.preventDefault();
                moveEvt.stopPropagation();
                onDrag(moveEvt.movementX, moveEvt.movementY);
            };

            const onMouseUp = (upEvt: MouseEvent) => {
                upEvt.preventDefault();
                upEvt.stopPropagation();

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => el.removeEventListener('mousedown', onMouseDown);
    };

    useEffect(() => {
        if (!canResizeWidth || typeof resolvedWidth !== 'number') return;

        return addDragListener(horizontalRef, (dx) => {
            const nextWidth = clamp(
                widthRef.current - dx,
                width.min,
                width.max
            );
            onWidthChange(nextWidth);
            widthRef.current = nextWidth;
        });
    }, [canResizeWidth, resolvedWidth, width.max, width.min, onWidthChange]);

    useEffect(() => {
        if (!canResizeHeight || typeof resolvedHeight !== 'number') return;

        const minValue = typeof height.min === 'number' ? height.min : 0;

        return addDragListener(verticalRef, (_, dy) => {
            const nextHeight = clamp(
                heightRef.current + dy,
                minValue,
                height.max
            );
            onHeightChange(nextHeight);
            heightRef.current = nextHeight;
        });
    }, [
        canResizeHeight,
        resolvedHeight,
        height.max,
        height.min,
        onHeightChange,
    ]);

    useEffect(() => {
        if (!canResizeWidth || !canResizeHeight) return;
        if (
            typeof resolvedWidth !== 'number' ||
            typeof resolvedHeight !== 'number'
        )
            return;

        const minHeightValue = typeof height.min === 'number' ? height.min : 0;

        return addDragListener(cornerRef, (dx, dy) => {
            const nextWidth = clamp(
                widthRef.current - dx,
                width.min,
                width.max
            );
            const nextHeight = clamp(
                heightRef.current + dy,
                minHeightValue,
                height.max
            );
            onWidthChange(nextWidth);
            onHeightChange(nextHeight);
            widthRef.current = nextWidth;
            heightRef.current = nextHeight;
        });
    }, [
        canResizeWidth,
        canResizeHeight,
        resolvedWidth,
        resolvedHeight,
        height.min,
        height.max,
        width.min,
        width.max,
        onWidthChange,
        onHeightChange,
    ]);

    return (
        <>
            {canResizeWidth && (
                <div
                    ref={horizontalRef}
                    className="absolute top-0 left-0 z-50 h-full w-2 cursor-ew-resize"
                />
            )}

            {canResizeHeight && (
                <div
                    ref={verticalRef}
                    className="absolute bottom-0 left-0 z-50 h-2 w-full cursor-ns-resize"
                />
            )}

            {canResizeWidth && canResizeHeight && (
                <div
                    ref={cornerRef}
                    className="absolute bottom-0 left-0 z-50 h-3 w-3 cursor-nesw-resize"
                />
            )}

            {children}
        </>
    );
}
