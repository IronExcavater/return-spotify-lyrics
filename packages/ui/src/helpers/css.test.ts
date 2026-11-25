import { describe, expect, it } from 'vitest';
import { toMilliseconds } from './css';

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
