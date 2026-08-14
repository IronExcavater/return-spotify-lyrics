import { clamp } from './resolveAppLayout';
import type { Dimension, MinMax, Size } from './types';

export type ResizeEdge = 'left' | 'bottom' | 'bottom-left';

export function resizeSize(
    start: Size<Dimension>,
    delta: Size<number>,
    edge: ResizeEdge,
    range: Size<MinMax<number>>
): Size<Dimension> {
    const next: Size<Dimension> = { ...start };

    if (
        (edge === 'left' || edge === 'bottom-left') &&
        typeof start.width === 'number'
    ) {
        next.width = clamp(start.width - delta.width, range.width);
    }

    if (
        (edge === 'bottom' || edge === 'bottom-left') &&
        typeof start.height === 'number'
    ) {
        next.height = clamp(start.height + delta.height, range.height);
    }

    return next;
}
