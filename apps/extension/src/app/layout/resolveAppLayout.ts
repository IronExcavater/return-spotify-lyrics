import type { ResizeMode } from '@return-spotify-lyrics/ui/Resizable';

import type { Surface } from '@/app/surface/types';

import { POPUP } from './surfaces';
import type { AppLayout, RouteLayout } from './types';

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function resizesWidth(mode: ResizeMode) {
    return mode === 'both' || mode === 'horizontal';
}

function resizesHeight(mode: ResizeMode) {
    return mode === 'both' || mode === 'vertical';
}

function resizeMode(width: boolean, height: boolean): ResizeMode {
    if (width && height) return 'both';
    if (width) return 'horizontal';
    if (height) return 'vertical';
    return false;
}

type AxisOptions = {
    remembered: number;
    min: number;
    max: number;
    resizable: boolean;
    value?: number | 'auto';
    routeMin?: number;
    routeMax?: number;
};

function resolveAxis({
    remembered,
    min,
    max,
    resizable,
    value,
    routeMin,
    routeMax,
}: AxisOptions) {
    const resolvedMin = routeMin ?? min;
    const resolvedMax = routeMax ?? max;
    const hasRouteBounds = routeMin !== undefined || routeMax !== undefined;

    let resolvedValue: number | 'auto' = clamp(
        remembered,
        resolvedMin,
        resolvedMax
    );

    if (value === 'auto') {
        resolvedValue = 'auto';
    } else if (typeof value === 'number') {
        resolvedValue = hasRouteBounds
            ? clamp(value, resolvedMin, resolvedMax)
            : value;
    }

    const canResize = resolvedValue !== 'auto' && resizable;

    return {
        value: resolvedValue,
        min: resolvedMin,
        max: resolvedMax,
        resize: canResize,
        remember: canResize && value === undefined && !hasRouteBounds,
    };
}

export function resolveAppLayout({
    surface,
    rememberedPopupSize,
    routeLayout,
}: {
    surface: Surface;
    rememberedPopupSize: { width: number; height: number };
    routeLayout?: RouteLayout;
}): AppLayout {
    const bar = routeLayout?.bar ?? 'preserve';

    if (surface === 'sidepanel') {
        return {
            surface,
            bar,
            viewport: { kind: 'browser' },
        };
    }

    const popup = routeLayout?.popup;
    const resize = popup?.resize ?? POPUP.resize;

    const width = resolveAxis({
        remembered: rememberedPopupSize.width,
        min: POPUP.minWidth,
        max: POPUP.maxWidth,
        resizable: resizesWidth(resize),
        value: popup?.width,
        routeMin: popup?.minWidth,
        routeMax: popup?.maxWidth,
    });

    const height = resolveAxis({
        remembered: rememberedPopupSize.height,
        min: POPUP.minHeight,
        max: POPUP.maxHeight,
        resizable: resizesHeight(resize),
        value: popup?.height,
        routeMin: popup?.minHeight,
        routeMax: popup?.maxHeight,
    });

    return {
        surface,
        bar,
        viewport: {
            kind: 'popup',
            width: width.value,
            height: height.value,
            minWidth: width.min,
            maxWidth: width.max,
            minHeight: height.min,
            maxHeight: height.max,
            resize: resizeMode(width.resize, height.resize),
            remember: resizeMode(width.remember, height.remember),
        },
    };
}
