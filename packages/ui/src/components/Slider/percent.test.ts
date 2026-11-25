import { describe, expect, it } from 'vitest';
import { toPercent } from './percent';

describe('toPercent', () => {
    it('places a value along the range', () => {
        expect(toPercent(72, 0, 225)).toBe(32);
    });

    it('places the minimum at the start', () => {
        expect(toPercent(60, 60, 180)).toBe(0);
    });

    it('places the maximum at the end', () => {
        expect(toPercent(180, 60, 180)).toBe(100);
    });

    it('keeps a value past the maximum at the end', () => {
        expect(toPercent(181, 60, 180)).toBe(100);
    });

    it('keeps a value below the minimum at the start', () => {
        expect(toPercent(-5, 0, 100)).toBe(0);
    });

    it('places everything at the start of an empty range', () => {
        expect(toPercent(50, 100, 100)).toBe(0);
    });

    it('places a missing value at the start', () => {
        expect(toPercent(NaN, 0, 100)).toBe(0);
    });
});
