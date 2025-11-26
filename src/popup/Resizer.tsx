import React from 'react';
import { useResize } from './hooks/useResize';

interface Props {
    children: React.ReactNode;

    widthSize: { min: number; max: number };
    heightSize: { min: number; max: number };

    widthOverride?: number;
    heightOverride?: number;
}

export function Resizer(props: Props) {
    const { horizontalResizeRef, verticalResizeRef, cornerResizeRef } =
        useResize(props);

    const { children, widthOverride, heightOverride } = props;

    const canResizeWidth = widthOverride === undefined;
    const canResizeHeight = heightOverride === undefined;

    return (
        <>
            {canResizeWidth && (
                <div
                    ref={horizontalResizeRef}
                    className="absolute top-0 left-0 z-50 h-full w-2 cursor-ew-resize"
                />
            )}
            {canResizeHeight && (
                <div
                    ref={verticalResizeRef}
                    className="absolute bottom-0 left-0 z-50 h-2 w-full cursor-ns-resize"
                />
            )}

            {canResizeWidth && canResizeHeight && (
                <div
                    ref={cornerResizeRef}
                    className="absolute bottom-0 left-0 z-50 h-3 w-3 cursor-nesw-resize"
                />
            )}

            {children}
        </>
    );
}
