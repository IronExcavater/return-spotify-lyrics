import { describe, expect, it } from 'vitest';
import { countCopies, holdEasing } from './motion';

// The positions of a linear() function, in order.
function positionsOf(easing: string): number[] {
    return [...easing.matchAll(/ ([\d.]+)%/g)].map((match) => Number(match[1]));
}

describe('countCopies', () => {
    it('adds one copy when the content is wider than the box', () => {
        expect(countCopies(240, 400)).toBe(1);
    });

    it('adds copies until the track covers the box and one more item', () => {
        // Four items of 80px make 320px, which is the 240px box plus one item.
        expect(countCopies(240, 80)).toBe(3);
    });

    it('needs no extra copy when the box is an exact number of items', () => {
        expect(countCopies(240, 120)).toBe(2);
    });

    it('makes no copies before the sizes are measured', () => {
        expect(countCopies(0, 400)).toBe(0);
        expect(countCopies(240, 0)).toBe(0);
    });
});

describe('holdEasing', () => {
    it('keeps the easing when nothing holds', () => {
        expect(holdEasing('ease-in-out', {})).toBe('ease-in-out');
    });

    it('holds at the start, then moves at a steady speed', () => {
        expect(holdEasing('linear', { start: 0.25 })).toBe(
            'linear(0, 0 25%, 1 100%, 1)'
        );
    });

    it('holds at the end after a steady move', () => {
        expect(holdEasing('linear', { end: 0.25 })).toBe(
            'linear(0, 0 0%, 1 75%, 1)'
        );
    });

    it('holds at both ends and eases between them', () => {
        const easing = holdEasing('ease-in-out', { start: 0.1, end: 0.1 });

        expect(easing).toMatch(/^linear\(0, 0 10%, /);
        expect(easing).toMatch(/, 1 90%, 1\)$/);
        const positions = positionsOf(easing);
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('keeps the holds below a whole pass, in proportion', () => {
        const easing = holdEasing('linear', { start: 1, end: 1 });
        expect(positionsOf(easing)).toEqual([49.5, 50.5]);
    });

    it('ignores a negative hold', () => {
        expect(holdEasing('linear', { start: -0.5 })).toBe('linear');
    });
});
