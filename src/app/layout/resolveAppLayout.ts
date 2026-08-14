import type { Surface } from '@/app/surface/types';
import { clamp, type MinMax, type Size } from '@/shared/geometry';

import { POPUP_RANGE, POPUP_RESIZE } from './surfaces';
import type { AppLayout, Dimension, RouteLayout } from './types';

type ResolveDimensionArgs = {
    remembered: number;
    surfaceRange: MinMax<number>;
    surfaceResizable: boolean;
    override?: Dimension;
    routeRange?: MinMax<number>;
    routeResizable?: boolean;
};

type ResolvedDimension = {
    value: Dimension;
    range: MinMax<number>;
    resize: boolean;
    persist: boolean;
};

export type ResolveAppLayoutArgs = {
    surface: Surface;
    rememberedPopupSize: Size<number>;
    routeLayout?: RouteLayout;
};

function resolveDimension({
    remembered,
    surfaceRange,
    surfaceResizable,
    override,
    routeRange,
    routeResizable,
}: ResolveDimensionArgs): ResolvedDimension {
    const range = routeRange ?? surfaceRange;
    const rememberedValue = clamp(remembered, range);

    let value: Dimension = rememberedValue;
    if (override === 'auto') {
        value = 'auto';
    } else if (typeof override === 'number') {
        value = routeRange ? clamp(override, routeRange) : override;
    }

    const resize = value !== 'auto' && (routeResizable ?? surfaceResizable);

    return {
        value,
        range,
        resize,
        persist: resize && override === undefined && routeRange === undefined,
    };
}

export function resolveAppLayout({
    surface,
    rememberedPopupSize,
    routeLayout,
}: ResolveAppLayoutArgs): AppLayout {
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
        surfaceRange: POPUP_RANGE.width,
        surfaceResizable: POPUP_RESIZE.width,
        override: popup?.size?.width,
        routeRange: popup?.range?.width,
        routeResizable: popup?.resize?.width,
    });
    const height = resolveDimension({
        remembered: rememberedPopupSize.height,
        surfaceRange: POPUP_RANGE.height,
        surfaceResizable: POPUP_RESIZE.height,
        override: popup?.size?.height,
        routeRange: popup?.range?.height,
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
            range: {
                width: width.range,
                height: height.range,
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
