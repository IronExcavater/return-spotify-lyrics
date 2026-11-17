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
export type Direction = 'all' | 'none' | readonly Edge[];

export type Sign = -1 | 0 | 1;

/** An edge and the direction it faces: -1 is left or top, 1 is right or bottom. */
export type EdgeInfo = {
    name: Edge;
    x: Sign;
    y: Sign;
};

export const EDGES: readonly EdgeInfo[] = [
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
export function cornerSides(corner: Corner): [Side, Side] {
    return corner.split('-') as [Side, Side];
}

export function resolveEdges(direction: Direction): readonly EdgeInfo[] {
    if (direction === 'all') return EDGES;
    if (direction === 'none') return [];

    return EDGES.filter(({ name }) => {
        if (direction.includes(name)) return true;
        if (!isCorner(name)) return false;

        const [vertical, horizontal] = cornerSides(name);
        return direction.includes(vertical) && direction.includes(horizontal);
    });
}

/** Keeps a size between two limits. A missing limit does not apply. */
export function clampSize(
    size: Size,
    min: Partial<Size>,
    max: Partial<Size>
): Size {
    return {
        width: clamp(size.width, min.width, max.width),
        height: clamp(size.height, min.height, max.height),
    };
}

function clamp(value: number, min = -Infinity, max = Infinity): number {
    return Math.min(Math.max(value, min), max);
}
