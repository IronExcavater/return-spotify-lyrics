export type Size = {
    width: number;
    height: number;
};

export type Point = {
    x: number;
    y: number;
};

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type Edge = Side | Corner;

/** The edges that a component acts on. Two adjacent sides also bring their corner. */
export type EdgeSet = 'all' | 'none' | readonly Edge[];

export type Sign = -1 | 0 | 1;

/** An edge and the direction it faces: -1 is left or top, 1 is right or bottom. */
export type EdgeVector = {
    name: Edge;
    x: Sign;
    y: Sign;
};

export const EDGES: readonly EdgeVector[] = [
    { name: 'top', x: 0, y: -1 },
    { name: 'bottom', x: 0, y: 1 },
    { name: 'left', x: -1, y: 0 },
    { name: 'right', x: 1, y: 0 },
    { name: 'top-left', x: -1, y: -1 },
    { name: 'top-right', x: 1, y: -1 },
    { name: 'bottom-left', x: -1, y: 1 },
    { name: 'bottom-right', x: 1, y: 1 },
];

export function isCorner(edge: Edge): edge is Corner {
    return edge.includes('-');
}

/** The two sides of a corner: the top or bottom side, then the left or right side. */
export function splitCorner(corner: Corner): [Side, Side] {
    return corner.split('-') as [Side, Side];
}

export function resolveEdges(edges: EdgeSet): readonly EdgeVector[] {
    if (edges === 'all') return EDGES;
    if (edges === 'none') return [];

    return EDGES.filter(({ name }) => {
        if (edges.includes(name)) return true;
        if (!isCorner(name)) return false;

        const [vertical, horizontal] = splitCorner(name);
        return edges.includes(vertical) && edges.includes(horizontal);
    });
}

export type Axis = 'width' | 'height';

/** Limits on a size. A missing limit does not apply. */
export type SizeLimits = {
    minSize?: Partial<Size> | undefined;
    maxSize?: Partial<Size> | undefined;
    /** The lowest width divided by height. */
    minAspectRatio?: number | undefined;
    /** The highest width divided by height. */
    maxAspectRatio?: number | undefined;
};

/** The range of one axis. The aspect ratios also apply the limits of the other axis to it. */
export function findAxisRange(
    axis: Axis,
    limits: SizeLimits
): [number, number] {
    const {
        minSize = {},
        maxSize = {},
        minAspectRatio = 0,
        maxAspectRatio = Infinity,
    } = limits;
    const minWidth = minSize.width ?? 0;
    const minHeight = minSize.height ?? 0;
    const maxWidth = maxSize.width ?? Infinity;
    const maxHeight = maxSize.height ?? Infinity;

    if (axis === 'width') {
        return [
            Math.max(minWidth, widthFor(minHeight, minAspectRatio)),
            Math.min(maxWidth, widthFor(maxHeight, maxAspectRatio)),
        ];
    }
    return [
        Math.max(minHeight, heightFor(minWidth, maxAspectRatio)),
        Math.min(maxHeight, heightFor(maxWidth, minAspectRatio)),
    ];
}

/** Fits a size inside its limits. The other axis changes first, and the lead axis changes only when it must. */
export function fitSize(size: Size, lead: Axis, limits: SizeLimits): Size {
    const follow = lead === 'width' ? 'height' : 'width';
    const leadValue = clamp(size[lead], ...findAxisRange(lead, limits));

    // A fixed lead axis leaves the other axis only the values that the aspect ratios allow.
    const fixed = {
        ...limits,
        minSize: { ...limits.minSize, [lead]: leadValue },
        maxSize: { ...limits.maxSize, [lead]: leadValue },
    };
    const followValue = clamp(size[follow], ...findAxisRange(follow, fixed));

    return lead === 'width'
        ? { width: leadValue, height: followValue }
        : { width: followValue, height: leadValue };
}

/** Puts the aspect ratios in order, so a lowest ratio above the highest one, like two controls set the wrong way round, still makes a range. */
export function orderRatios(limits: SizeLimits): SizeLimits {
    const { minAspectRatio, maxAspectRatio } = limits;
    const isReversed =
        minAspectRatio !== undefined &&
        maxAspectRatio !== undefined &&
        minAspectRatio > maxAspectRatio;
    if (!isReversed) return limits;
    return {
        ...limits,
        minAspectRatio: maxAspectRatio,
        maxAspectRatio: minAspectRatio,
    };
}

/**
 * Fits a size from a corner drag inside its limits. A size outside the aspect ratios moves to the nearest size on the
 * nearer ratio, so the size changes smoothly as the pointer moves, even across the line of a fixed ratio.
 */
export function fitCorner(size: Size, limits: SizeLimits): Size {
    const { minAspectRatio = 0, maxAspectRatio = Infinity } = limits;
    // A drag past the start makes the height zero or less, so the check multiplies and never divides by it.
    const isTooWide =
        Number.isFinite(maxAspectRatio) &&
        size.width > maxAspectRatio * size.height;
    const isTooTall = size.width < minAspectRatio * size.height;
    let onRatio = size;
    if (isTooWide) onRatio = projectOntoRatio(size, maxAspectRatio);
    if (isTooTall) onRatio = projectOntoRatio(size, minAspectRatio);
    return fitSize(onRatio, 'width', limits);
}

// The nearest size on the line where width is ratio times height, at the shortest distance from the size.
function projectOntoRatio({ width, height }: Size, ratio: number): Size {
    const scale = (width * ratio + height) / (ratio * ratio + 1);
    return { width: scale * ratio, height: scale };
}

// Without these checks, a size of 0 and an open ratio give NaN, not "no limit".
function widthFor(height: number, ratio: number): number {
    return ratio === Infinity ? Infinity : height * ratio;
}

function heightFor(width: number, ratio: number): number {
    return ratio === 0 ? Infinity : width / ratio;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
