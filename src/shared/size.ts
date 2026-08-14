export type Size<T = number> = {
    width: T;
    height: T;
};

export type MinMax = {
    min: number;
    max: number;
};

export type Bounds = Size<MinMax>;

export type Resize = Size<boolean>;

export function clamp(value: number, bounds: MinMax): number {
    return Math.min(bounds.max, Math.max(bounds.min, value));
}
