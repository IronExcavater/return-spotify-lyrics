import React from 'react';
import { usePopupSize } from './hooks/usePopupSize';

interface Props {
    children: React.ReactNode;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}

export function PopupSizer({
    children,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
}: Props) {
    const { widthResizerRef, heightResizerRef } = usePopupSize({
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
    });

    return (
        <>
            {/* Right drag handle */}
            <div
                ref={widthResizerRef}
                className="absolute top-0 left-0 z-50 h-full w-2 cursor-ew-resize"
            />

            {/* Bottom drag handle */}
            <div
                ref={heightResizerRef}
                className="absolute right-0 bottom-0 z-50 h-full w-2 cursor-ns-resize"
            />

            {children}
        </>
    );
}
