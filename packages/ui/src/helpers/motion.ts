import { easingCoordinates } from 'easing-coordinates';
import type { Easing } from './gradient';

// A hold of a whole pass would never move, so the holds together stop just short of it.
const MAX_HOLD = 0.99;

/** A share of an animation's time, from 0 to 1, that holds still at its start and at its end. */
export type Hold = {
    start?: number;
    end?: number;
};

/** The copies after the original that keep a loop seamless, because the track must cover the box and one more item. */
export function countCopies(box: number, item: number): number {
    if (box <= 0 || item <= 0) return 0;
    return Math.ceil(box / item);
}

/**
 * A `linear()` timing function that holds still for part of the time at the start and at the end, and follows
 * `easing` between them. Holds that add up to a whole pass shrink in proportion, so the animation still moves.
 */
export function holdEasing(
    easing: Easing,
    { start = 0, end = 0 }: Hold
): string {
    const wanted = Math.max(start, 0) + Math.max(end, 0);
    if (wanted === 0) return easing;

    const scale = Math.min(wanted, MAX_HOLD) / wanted;
    const from = Math.max(start, 0) * scale;
    const span = 1 - wanted * scale;
    const points = curveOf(easing).map(
        ({ x, y }) => `${round(y)} ${percent(from + x * span)}`
    );
    return `linear(0, ${points.join(', ')}, 1)`;
}

// A linear easing is a straight line, so its two ends are enough.
function curveOf(easing: Easing): { x: number; y: number }[] {
    if (easing === 'linear') {
        return [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        ];
    }
    return easingCoordinates(easing);
}

function percent(share: number): string {
    return `${round(share * 100)}%`;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}
