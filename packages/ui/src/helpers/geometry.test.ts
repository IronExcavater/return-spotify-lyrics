import { describe, expect, it } from 'vitest';
import { findAxisRange, fitCorner, fitSize, orderRatios } from './geometry';

describe('findAxisRange', () => {
    it('passes the limits of the other axis through the aspect ratios', () => {
        const limits = {
            minSize: { height: 100 },
            maxSize: { height: 200 },
            minAspectRatio: 1,
            maxAspectRatio: 2,
        };
        expect(findAxisRange('width', limits)).toEqual([100, 400]);
        // Without a ratio, a width limit does not limit the height.
        expect(findAxisRange('height', { maxSize: { width: 300 } })).toEqual([
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

describe('fitCorner', () => {
    const limits = { minAspectRatio: 1, maxAspectRatio: 2 };

    it('keeps a size inside the ratios as it is', () => {
        expect(fitCorner({ width: 300, height: 200 }, limits)).toEqual({
            width: 300,
            height: 200,
        });
    });

    it('moves a size that is too wide to the nearest size at the highest ratio', () => {
        expect(fitCorner({ width: 500, height: 200 }, limits)).toEqual({
            width: 480,
            height: 240,
        });
    });

    it('moves a size that is too tall to the nearest size at the lowest ratio', () => {
        expect(fitCorner({ width: 200, height: 300 }, limits)).toEqual({
            width: 250,
            height: 250,
        });
    });

    it('changes the size only a little when the pointer crosses the line of a fixed ratio', () => {
        const ratio = { minAspectRatio: 16 / 9, maxAspectRatio: 16 / 9 };
        const below = fitCorner({ width: 400, height: 226 }, ratio);
        const above = fitCorner({ width: 400, height: 224 }, ratio);
        expect(Math.abs(below.width - above.width)).toBeLessThan(2);
    });

    it('changes the size only a little when the pointer drags the height past zero', () => {
        const atZero = fitCorner({ width: 320, height: 0 }, limits);
        const pastZero = fitCorner({ width: 320, height: -1 }, limits);
        expect(atZero).toEqual({ width: 256, height: 128 });
        expect(Math.abs(atZero.width - pastZero.width)).toBeLessThan(1);
        expect(Math.abs(atZero.height - pastZero.height)).toBeLessThan(1);
    });

    it('keeps the size limits after the ratio', () => {
        const small = fitCorner(
            { width: 500, height: 200 },
            { ...limits, maxSize: { width: 400 } }
        );
        // The width stops at its maximum, and the height stays where the ratio put it, inside the range.
        expect(small).toEqual({ width: 400, height: 240 });
    });
});

describe('orderRatios', () => {
    it('swaps a lowest ratio that is above the highest one', () => {
        expect(orderRatios({ minAspectRatio: 2, maxAspectRatio: 1 })).toEqual({
            minAspectRatio: 1,
            maxAspectRatio: 2,
        });
    });

    it('keeps ratios that are in order', () => {
        const limits = { minAspectRatio: 1, maxAspectRatio: 2 };
        expect(orderRatios(limits)).toEqual(limits);
    });

    it('keeps a single ratio limit', () => {
        expect(orderRatios({ minAspectRatio: 1.5 })).toEqual({
            minAspectRatio: 1.5,
        });
    });
});
