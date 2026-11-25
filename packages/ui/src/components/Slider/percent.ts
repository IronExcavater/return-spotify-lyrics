/** Where a value sits along a range, from 0 at the minimum to 100 at the maximum. A value outside the range stays at an end. */
export function toPercent(value: number, min: number, max: number): number {
    if (!(max > min) || Number.isNaN(value)) return 0;
    const share = (value - min) / (max - min);
    return Math.min(Math.max(share, 0), 1) * 100;
}
