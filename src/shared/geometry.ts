export type Size<T> = {
    width: T;
    height: T;
};

export type MinMax<T = number> = {
    min: T;
    max: T;
};

export type CssDimension = number | string;

export function clamp(value: number, range: MinMax<number>): number {
    return Math.min(range.max, Math.max(range.min, value));
}
