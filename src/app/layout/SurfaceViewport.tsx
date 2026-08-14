import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { popupSizeStorage } from './popupSizeStorage';
import { ResizeHandle } from './ResizeHandle';
import { resizeSize, type ResizeEdge } from './resize';
import type { AppLayout, Dimension, PopupViewportLayout, Size } from './types';

type SurfaceViewportProps = {
    layout: AppLayout;
    children: ReactNode;
};

type PopupViewportProps = {
    viewport: PopupViewportLayout;
    children: ReactNode;
};

function applyDimension(property: 'width' | 'height', value: Dimension) {
    const cssValue = typeof value === 'number' ? `${value}px` : value;
    document.documentElement.style[property] = cssValue;
    document.body.style[property] = cssValue;
}

function PopupViewport({ viewport, children }: PopupViewportProps) {
    const [liveSize, setLiveSizeState] = useState(viewport.size);
    const liveSizeRef = useRef<Size<Dimension>>(viewport.size);
    const startSizeRef = useRef<Size<Dimension>>(viewport.size);

    const setLiveSize = (size: Size<Dimension>) => {
        liveSizeRef.current = size;
        setLiveSizeState(size);
    };

    useEffect(() => {
        setLiveSize(viewport.size);
    }, [viewport.size.width, viewport.size.height]);

    useLayoutEffect(() => {
        applyDimension('width', liveSize.width);
        applyDimension('height', liveSize.height);

        return () => {
            document.documentElement.style.removeProperty('width');
            document.documentElement.style.removeProperty('height');
            document.body.style.removeProperty('width');
            document.body.style.removeProperty('height');
        };
    }, [liveSize.height, liveSize.width]);

    const persistResize = () => {
        if (!viewport.persist.width && !viewport.persist.height) return;

        const finalSize = liveSizeRef.current;
        void popupSizeStorage.getValue().then((remembered) =>
            popupSizeStorage.setValue({
                width:
                    viewport.persist.width &&
                    typeof finalSize.width === 'number'
                        ? finalSize.width
                        : remembered.width,
                height:
                    viewport.persist.height &&
                    typeof finalSize.height === 'number'
                        ? finalSize.height
                        : remembered.height,
            })
        );
    };

    const resize = (edge: ResizeEdge, delta: Size<number>) => {
        setLiveSize(
            resizeSize(startSizeRef.current, delta, edge, viewport.range)
        );
    };

    const canResizeWidth =
        viewport.resize.width && typeof liveSize.width === 'number';
    const canResizeHeight =
        viewport.resize.height && typeof liveSize.height === 'number';

    return (
        <div className="relative h-full w-full">
            {canResizeWidth ? (
                <ResizeHandle
                    edge="left"
                    onResizeStart={() => {
                        startSizeRef.current = liveSizeRef.current;
                    }}
                    onResize={(delta) => resize('left', delta)}
                    onResizeEnd={persistResize}
                />
            ) : null}

            {canResizeHeight ? (
                <ResizeHandle
                    edge="bottom"
                    onResizeStart={() => {
                        startSizeRef.current = liveSizeRef.current;
                    }}
                    onResize={(delta) => resize('bottom', delta)}
                    onResizeEnd={persistResize}
                />
            ) : null}

            {canResizeWidth && canResizeHeight ? (
                <ResizeHandle
                    edge="bottom-left"
                    onResizeStart={() => {
                        startSizeRef.current = liveSizeRef.current;
                    }}
                    onResize={(delta) => resize('bottom-left', delta)}
                    onResizeEnd={persistResize}
                />
            ) : null}

            {children}
        </div>
    );
}

export function SurfaceViewport({ layout, children }: SurfaceViewportProps) {
    if (layout.viewport.kind === 'browser') {
        return children;
    }

    return <PopupViewport viewport={layout.viewport}>{children}</PopupViewport>;
}
