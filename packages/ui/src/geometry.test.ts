import { describe, expect, it } from 'vitest';
import { axisRange, fitSize, keepsAspectRatio } from './geometry';

describe('keepsAspectRatio', () => {
    const limits = { minAspectRatio: 1, maxAspectRatio: 2 };

    it('allows up to a pixel of rounding', () => {
        expect(keepsAspectRatio({ width: 100, height: 100.5 }, limits)).toBe(
            true
        );
        expect(keepsAspectRatio({ width: 201, height: 100 }, limits)).toBe(
            true
        );
    });

    it('rejects a size outside the ratios', () => {
        expect(keepsAspectRatio({ width: 100, height: 132 }, limits)).toBe(
            false
        );
        expect(keepsAspectRatio({ width: 300, height: 100 }, limits)).toBe(
            false
        );
    });

    it('accepts any size without ratios', () => {
        expect(keepsAspectRatio({ width: 300, height: 1 }, {})).toBe(true);
    });
});

describe('axisRange', () => {
    it('passes the limits of the other axis through the aspect ratios', () => {
        const limits = {
            minSize: { height: 100 },
            maxSize: { height: 200 },
            minAspectRatio: 1,
            maxAspectRatio: 2,
        };
        expect(axisRange('width', limits)).toEqual([100, 400]);
        // Without a ratio, a width limit does not limit the height.
        expect(axisRange('height', { maxSize: { width: 300 } })).toEqual([
            0,
            Infinity,
        ]);
    });
});

describe('fitSize', () => {
    it('keeps a size between the min and max size', () => {
        const limits = { minSize: { width: 100 }, maxSize: { height: 200 } };
        expect(fitSize({ width: 50, height: 300 }, 'width', limits)).toEqual({
            width: 100,
            height: 200,
        });
    });

    it('changes the other axis to keep the aspect ratio in range', () => {
        const limits = { minAspectRatio: 1, maxAspectRatio: 2 };
        const wide = { width: 500, height: 200 };
        expect(fitSize(wide, 'width', limits)).toEqual({
            width: 500,
            height: 250,
        });
        expect(fitSize(wide, 'height', limits)).toEqual({
            width: 400,
            height: 200,
        });
        expect(fitSize({ width: 100, height: 300 }, 'width', limits)).toEqual({
            width: 100,
            height: 100,
        });
    });

    it('stops the lead axis when the other axis cannot follow it', () => {
        const limits = {
            maxSize: { height: 300 },
            minAspectRatio: 1,
            maxAspectRatio: 1,
        };
        expect(fitSize({ width: 500, height: 200 }, 'width', limits)).toEqual({
            width: 300,
            height: 300,
        });
    });

    it('allows a size of 0 when no limit stops it', () => {
        expect(fitSize({ width: -20, height: 0 }, 'height', {})).toEqual({
            width: 0,
            height: 0,
        });
        expect(
            fitSize({ width: 0, height: 50 }, 'width', { maxAspectRatio: 2 })
        ).toEqual({ width: 0, height: 50 });
    });
});
