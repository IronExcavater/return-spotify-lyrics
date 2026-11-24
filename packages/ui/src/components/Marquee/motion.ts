import { easingCoordinates } from 'easing-coordinates';

/** How the content moves: in a loop to the left or the right, or back and forth. */
export type MarqueeMode = 'left' | 'right' | 'bounce';

// A rest of a whole pass would never move, so a rest stops just short of it.
const MAX_REST = 0.99;

/** The copies after the original that keep a loop seamless, because the track must cover the box and one more item. */
export function countCopies(box: number, item: number): number {
    if (box <= 0 || item <= 0) return 0;
    return Math.ceil(box / item);
}

/** A `linear()` timing function that rests for part of each pass, so that a person can read the start. */
export function restEasing(mode: MarqueeMode, rest: number): string {
    const share = Math.min(Math.max(rest, 0), MAX_REST);
    if (mode !== 'bounce') {
        return share === 0 ? 'linear' : `linear(0, 0 ${percent(share)}, 1)`;
    }
    if (share === 0) return 'ease-in-out';

    // A bounce plays every other pass backwards, so half the rest goes at each end.
    const start = share / 2;
    const points = easingCoordinates('ease-in-out').map(
        ({ x, y }) => `${round(y)} ${percent(start + x * (1 - share))}`
    );
    return `linear(0, ${points.join(', ')}, 1)`;
}

/** A CSS time, like `200ms` or `0.3s`, in milliseconds. */
export function toMilliseconds(time: string): number {
    const value = parseFloat(time);
    if (!Number.isFinite(value)) return 0;
    return time.trim().endsWith('ms') ? value : value * 1000;
}

function percent(share: number): string {
    return `${round(share * 100)}%`;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
