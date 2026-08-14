import { clamp } from './resolveAppLayout';
import type { Dimension, MinMax, Size } from './types';

export type ResizeEdge =
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

function resizesFromLeft(edge: ResizeEdge) {
    return edge === 'left' || edge === 'top-left' || edge === 'bottom-left';
}

function resizesFromRight(edge: ResizeEdge) {
    return edge === 'right' || edge === 'top-right' || edge === 'bottom-right';
}

function resizesFromTop(edge: ResizeEdge) {
    return edge === 'top' || edge === 'top-left' || edge === 'top-right';
}

function resizesFromBottom(edge: ResizeEdge) {
    return edge === 'bottom' || edge === 'bottom-left' || edge === 'bottom-right';
}

export function resizeSize(
    start: Size<Dimension>,
    delta: Size<number>,
    edge: ResizeEdge,
    range: Size<MinMax<number>>
): Size<Dimension> {
    const next: Size<Dimension> = { ...start };

    if (typeof start.width === 'number') {
        if (resizesFromLeft(edge)) {
            next.width = clamp(start.width - delta.width, range.width);
        } else if (resizesFromRight(edge)) {
            next.width = clamp(start.width + delta.width, range.width);
        }
    }

    if (typeof start.height === 'number') {
        if (resizesFromTop(edge)) {
            next.height = clamp(start.height - delta.height, range.height);
        } else if (resizesFromBottom(edge)) {
            next.height = clamp(start.height + delta.height, range.height);
        }
    }

    return next;
}
