import { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet } from 'react-router';

import type { Size } from '@/shared/geometry';
import {
    RESIZE_EDGES,
    Resizable,
    type ResizeEdge,
} from '@/ui/Resizable';

import { AppBar } from './AppBar';
import { popupSizeStorage } from './layout/popupSizeStorage';
import type { Dimension, PopupViewportLayout } from './layout/types';
import { useAppLayout } from './layout/useAppLayout';

function applyDocumentDimension(
    property: 'width' | 'height',
    value: Dimension
) {
    const cssValue = typeof value === 'number' ? `${value}px` : value;
    document.documentElement.style[property] = cssValue;
    document.body.style[property] = cssValue;
}

function clearDocumentSize() {
    document.documentElement.style.removeProperty('width');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');
}

function getResizeEdges(
    viewport: PopupViewportLayout,
    size: Size<Dimension>
): readonly ResizeEdge[] {
    const width = viewport.resize.width && typeof size.width === 'number';
    const height = viewport.resize.height && typeof size.height === 'number';

    if (width && height) return RESIZE_EDGES;
    if (width) return ['left', 'right'];
    if (height) return ['top', 'bottom'];
    return [];
}

export function AppShell() {
    const layout = useAppLayout();
    const popupViewport =
        layout.viewport.kind === 'popup' ? layout.viewport : null;
    const [popupSize, setPopupSize] = useState<Size<Dimension> | null>(
        popupViewport?.size ?? null
    );

    useEffect(() => {
        setPopupSize(popupViewport?.size ?? null);
    }, [popupViewport?.size.height, popupViewport?.size.width]);

    useLayoutEffect(() => {
        if (!popupViewport || !popupSize) {
            clearDocumentSize();
            return;
        }

        applyDocumentDimension('width', popupSize.width);
        applyDocumentDimension('height', popupSize.height);

        return clearDocumentSize;
    }, [popupSize, popupViewport]);

    const persistPopupSize = async (size: Size<Dimension>) => {
        if (!popupViewport) return;
        if (!popupViewport.persist.width && !popupViewport.persist.height) return;

        const remembered = await popupSizeStorage.getValue();
        await popupSizeStorage.setValue({
            width:
                popupViewport.persist.width && typeof size.width === 'number'
                    ? size.width
                    : remembered.width,
            height:
                popupViewport.persist.height && typeof size.height === 'number'
                    ? size.height
                    : remembered.height,
        });
    };

    const content = (
        <div className="flex h-full min-h-0 flex-col bg-app text-text">
            <AppBar policy={layout.bar} />
            <main className="min-h-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );

    if (!popupViewport || !popupSize) return content;

    return (
        <Resizable
            size={popupSize}
            range={popupViewport.range}
            edges={getResizeEdges(popupViewport, popupSize)}
            onResize={setPopupSize}
            onResizeEnd={(size) => {
                void persistPopupSize(size);
            }}
        >
            {content}
        </Resizable>
    );
}
