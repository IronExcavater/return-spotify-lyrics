import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import clsx from 'clsx';

import type { Size } from './types';
import type { ResizeEdge } from './resize';

type ResizeHandleProps = {
    edge: ResizeEdge;
    onResizeStart: () => void;
    onResize: (delta: Size<number>) => void;
    onResizeEnd: () => void;
};

const edgeClass = {
    left: 'top-0 bottom-0 left-0 w-1.5 cursor-ew-resize',
    bottom: 'right-0 bottom-0 left-0 h-1.5 cursor-ns-resize',
    'bottom-left': 'bottom-0 left-0 size-3 cursor-nesw-resize',
} satisfies Record<ResizeEdge, string>;

export function ResizeHandle({
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
        onResizeEnd();
    };

    return (
        <div
            aria-hidden="true"
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
                onResizeStart();
            }}
            onPointerMove={(event) => {
                const start = drag.current;
                if (!start || start.pointerId !== event.pointerId) return;

                onResize({
                    width: event.clientX - start.x,
                    height: event.clientY - start.y,
                });
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
        />
    );
}
