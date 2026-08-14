import type { Surface } from '@/app/surface/types';
import { clamp, type MinMax, type Size } from '@/shared/size';

import { POPUP_BOUNDS, POPUP_RESIZE } from './surfaces';
import type { AppLayout, Dimension, RouteLayout } from './types';

type DimensionOptions = {
    remembered: number;
    bounds: MinMax;
    resizable: boolean;
    override?: Dimension;
    routeBounds?: MinMax;
    routeResizable?: boolean;
};

type ResolvedDimension = {
    value: Dimension;
    bounds: MinMax;
    resize: boolean;
    persist: boolean;
};

export type ResolveAppLayoutOptions = {
    surface: Surface;
    rememberedPopupSize: Size;
    routeLayout?: RouteLayout;
};

function resolveDimension({
    remembered,
    bounds,
    resizable,
    override,
    routeBounds,
    routeResizable,
}: DimensionOptions): ResolvedDimension {
    const resolvedBounds = routeBounds ?? bounds;
    const rememberedValue = clamp(remembered, resolvedBounds);

    let value: Dimension = rememberedValue;
    if (override === 'auto') {
        value = 'auto';
    } else if (typeof override === 'number') {
        value = routeBounds ? clamp(override, routeBounds) : override;
    }

    const resize = value !== 'auto' && (routeResizable ?? resizable);

    return {
        value,
        bounds: resolvedBounds,
        resize,
        persist: resize && override === undefined && routeBounds === undefined,
    };
}

export function resolveAppLayout({
    surface,
    rememberedPopupSize,
    routeLayout,
}: ResolveAppLayoutOptions): AppLayout {
    const bar = routeLayout?.bar ?? 'preserve';

    if (surface === 'sidepanel') {
        return {
            surface,
            bar,
            viewport: { kind: 'browser' },
        };
    }

    const popup = routeLayout?.popup;
    const width = resolveDimension({
        remembered: rememberedPopupSize.width,
        bounds: POPUP_BOUNDS.width,
        resizable: POPUP_RESIZE.width,
        override: popup?.size?.width,
        routeBounds: popup?.bounds?.width,
        routeResizable: popup?.resize?.width,
    });
    const height = resolveDimension({
        remembered: rememberedPopupSize.height,
        bounds: POPUP_BOUNDS.height,
        resizable: POPUP_RESIZE.height,
        override: popup?.size?.height,
        routeBounds: popup?.bounds?.height,
        routeResizable: popup?.resize?.height,
    });

    return {
        surface,
        bar,
        viewport: {
            kind: 'popup',
            size: {
                width: width.value,
                height: height.value,
            },
            bounds: {
                width: width.bounds,
                height: height.bounds,
            },
            resize: {
                width: width.resize,
                height: height.resize,
            },
            persist: {
                width: width.persist,
                height: height.persist,
            },
        },
    };
}
