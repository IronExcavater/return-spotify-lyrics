import { describe, expect, it } from 'vitest';

import { resizeSize, type ResizeEdge } from './resize';

const range = {
    width: { min: 350, max: 520 },
    height: { min: 320, max: 700 },
};

function resize(edge: string, width: number, height: number) {
    return resizeSize(
        { width: 400, height: 520 },
        { width, height },
        edge as ResizeEdge,
        range
    );
}

describe('resizeSize', () => {
    it('grows width when the left edge is dragged left', () => {
        expect(resize('left', -40, 0)).toEqual({ width: 440, height: 520 });
    });

    it('grows width when the right edge is dragged right', () => {
        expect(resize('right', 40, 0)).toEqual({ width: 440, height: 520 });
    });

    it('grows height when the top edge is dragged up', () => {
        expect(resize('top', 0, -40)).toEqual({ width: 400, height: 560 });
    });

    it('grows height when the bottom edge is dragged down', () => {
        expect(resize('bottom', 0, 40)).toEqual({ width: 400, height: 560 });
    });

    it.each([
        ['top-left', -40, -40, { width: 440, height: 560 }],
        ['top-right', 40, -40, { width: 440, height: 560 }],
        ['bottom-left', -40, 40, { width: 440, height: 560 }],
        ['bottom-right', 40, 40, { width: 440, height: 560 }],
    ])('resizes from the %s corner', (edge, dx, dy, expected) => {
        expect(resize(edge, dx, dy)).toEqual(expected);
    });

    it('clamps width and height when resizing a corner', () => {
        expect(resize('bottom-left', -500, 500)).toEqual({
            width: 520,
            height: 700,
        });
    });

    it('does not convert auto dimensions to numbers', () => {
        expect(
            resizeSize(
                { width: 320, height: 'auto' },
                { width: 20, height: 100 },
                'bottom',
                range
            )
        ).toEqual({ width: 320, height: 'auto' });
    });
});
