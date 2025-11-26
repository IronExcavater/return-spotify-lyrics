import React, { useEffect, useRef, useState } from 'react';
import { getFromStorage, setInStorage } from '../../shared/storage';

const WIDTH_KEY = 'popupWidth';
const HEIGHT_KEY = 'popupHeight';

interface Props {
    widthSize: { min: number; max: number };
    heightSize: { min: number; max: number };

    widthOverride?: number;
    heightOverride?: number;
}

export function useResize({
    widthSize,
    heightSize,
    widthOverride,
    heightOverride,
}: Props) {
    const horizontalResizeRef = useRef<HTMLDivElement>(null);
    const verticalResizeRef = useRef<HTMLDivElement>(null);
    const cornerResizeRef = useRef<HTMLDivElement>(null);

    const [width, setWidth] = useState(360);
    const [height, setHeight] = useState(100);

    const canResizeWidth = widthOverride === undefined;
    const canResizeHeight = heightOverride === undefined;

    function applyDimension(
        element: HTMLElement,
        cssProp: 'width' | 'height',
        override: number | undefined,
        measured: number
    ) {
        let value: string;

        if (override === 0) value = 'auto';
        else if (override !== undefined) value = `${override}px`;
        else value = `${measured}px`;

        element.style[cssProp] = value;
    }

    useEffect(() => {
        applyDimension(document.body, 'width', widthOverride, width);
    }, [width, widthOverride]);

    useEffect(() => {
        applyDimension(document.body, 'height', heightOverride, height);
    }, [height, heightOverride]);

    useEffect(() => {
        getFromStorage<number>(WIDTH_KEY, (w) => w && setWidth(w));
        getFromStorage<number>(HEIGHT_KEY, (h) => h && setHeight(h));
    }, []);

    const widthRef = useRef(width);
    const heightRef = useRef(height);

    useEffect(() => {
        widthRef.current = width;
    }, [width]);

    useEffect(() => {
        heightRef.current = height;
    }, [height]);

    const addDragListener = (
        ref: React.RefObject<HTMLDivElement>,
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
        if (!canResizeWidth) return;

        return addDragListener(horizontalResizeRef, (dx) => {
            const newWidth = Math.min(
                widthSize.max,
                Math.max(widthSize.min, widthRef.current - dx)
            );
            setWidth(newWidth);
            void setInStorage(WIDTH_KEY, newWidth);
        });
    }, [canResizeWidth]);

    useEffect(() => {
        if (!canResizeHeight) return;

        return addDragListener(verticalResizeRef, (_, dy) => {
            const newHeight = Math.min(
                heightSize.max,
                Math.max(heightSize.min, heightRef.current + dy)
            );
            console.log(newHeight);
            setHeight(newHeight);
            void setInStorage(HEIGHT_KEY, newHeight);
        });
    }, [canResizeHeight]);

    useEffect(() => {
        if (!canResizeWidth || !canResizeHeight) return;

        return addDragListener(cornerResizeRef, (dx, dy) => {
            const newWidth = Math.min(
                widthSize.max,
                Math.max(widthSize.min, widthRef.current - dx)
            );
            const newHeight = Math.min(
                heightSize.max,
                Math.max(heightSize.min, heightRef.current + dy)
            );
            setWidth(newWidth);
            setHeight(newHeight);
            void setInStorage(WIDTH_KEY, newWidth);
            void setInStorage(HEIGHT_KEY, newHeight);
        });
    }, [canResizeWidth, canResizeHeight]);

    return {
        width,
        height,
        horizontalResizeRef,
        verticalResizeRef,
        cornerResizeRef,
    };
}
