import { describe, expect, it } from 'vitest';
import { formatCount } from './count';

describe('formatCount', () => {
    it('shows a count below the maximum', () => {
        expect(formatCount(3, 99)).toBe('3');
    });

    it('shows a count at the maximum', () => {
        expect(formatCount(99, 99)).toBe('99');
    });

    it('caps a count one past the maximum', () => {
        expect(formatCount(100, 99)).toBe('99+');
    });

    it('caps an endless count', () => {
        expect(formatCount(Infinity, 99)).toBe('99+');
    });

    it('shows zero for a negative count', () => {
        expect(formatCount(-2, 99)).toBe('0');
    });

    it('shows zero for a missing count', () => {
        expect(formatCount(NaN, 99)).toBe('0');
    });

    it('drops the fraction of a count', () => {
        expect(formatCount(2.7, 99)).toBe('2');
    });
});
