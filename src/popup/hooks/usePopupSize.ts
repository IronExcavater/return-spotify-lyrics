import { useEffect, useRef, useState } from 'react';
import { getFromStorage, setInStorage } from '../../shared/storage';

const WIDTH_KEY = 'popupWidth';
const HEIGHT_KEY = 'popupHeight';

interface Props {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}

export function usePopupSize({
    minWidth = 300,
    maxWidth = 600,
    minHeight = 200,
    maxHeight = 800,
}: Props = {}) {
    const widthResizerRef = useRef<HTMLDivElement>(null);
    const heightResizerRef = useRef<HTMLDivElement>(null);

    const [width, setWidth] = useState(360);
    const [height, setHeight] = useState(500);

    useEffect(() => {
        document.body.style.width = `${width}px`;
    }, [width]);

    useEffect(() => {
        document.body.style.height = `${height}px`;
    }, [height]);

    useEffect(() => {
        getFromStorage<number>(WIDTH_KEY, (userWidth) => {
            if (!userWidth) return;

            setWidth(Math.max(userWidth, width));
        });
    }, []);

    useEffect(() => {
        const el = widthResizerRef.current;
        if (!el) return;

        let startX = 0;
        let startWidth = 0;

        const onMouseDown = (e: MouseEvent) => {
            startX = e.clientX;
            startWidth = width;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(
                minWidth,
                Math.min(maxWidth, startWidth + deltaX)
            );
            setWidth(newWidth);
        };

        const onMouseUp = (e: MouseEvent) => {
            void setInStorage<number>(WIDTH_KEY, width);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => el.removeEventListener('mousedown', onMouseDown);
    }, [width]);

    useEffect(() => {
        const el = heightResizerRef.current;
        if (!el) return;

        let startY = 0;
        let startHeight = 0;

        const onMouseDown = (e: MouseEvent) => {
            startY = e.clientY;
            startHeight = height;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - startY;
            const newHeight = Math.max(
                minHeight,
                Math.min(maxHeight, startHeight + deltaY)
            );
            setWidth(newHeight);
        };

        const onMouseUp = (e: MouseEvent) => {
            void setInStorage<number>(HEIGHT_KEY, height);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => el.removeEventListener('mousedown', onMouseDown);
    }, [height]);

    return {
        width,
        height,
        widthResizerRef,
        heightResizerRef,
        setWidth,
        setHeight,
    };
}
