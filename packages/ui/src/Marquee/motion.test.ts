import { describe, expect, it } from 'vitest';
import { countCopies, restEasing, toMilliseconds } from './motion';

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

describe('restEasing', () => {
    it('rests at the start of each loop, then moves at a steady speed', () => {
        expect(restEasing('left', 0.25)).toBe('linear(0, 0 25%, 1)');
    });

    it('moves at a steady speed with no rest', () => {
        expect(restEasing('right', 0)).toBe('linear');
    });

    it('rests at both ends of a bounce and eases between them', () => {
        const easing = restEasing('bounce', 0.2);

        expect(easing).toMatch(/^linear\(0, 0 10%, /);
        expect(easing).toMatch(/, 1 90%, 1\)$/);

        const positions = [...easing.matchAll(/ ([\d.]+)%/g)].map((match) =>
            Number(match[1])
        );
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('eases a bounce with no rest', () => {
        expect(restEasing('bounce', 0)).toBe('ease-in-out');
    });

    it('keeps a rest below a whole pass', () => {
        expect(restEasing('left', 1.5)).toBe('linear(0, 0 99%, 1)');
    });
});

describe('toMilliseconds', () => {
    it('reads a CSS time in milliseconds or seconds', () => {
        expect(toMilliseconds('200ms')).toBe(200);
        expect(toMilliseconds(' 0.3s')).toBe(300);
    });

    it('gives no time for a missing or zero value', () => {
        expect(toMilliseconds('')).toBe(0);
        expect(toMilliseconds('0s')).toBe(0);
    });
});
