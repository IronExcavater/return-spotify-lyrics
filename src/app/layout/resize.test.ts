import { describe, expect, it } from 'vitest';

import { resizeSize } from './resize';

const range = {
    width: { min: 350, max: 520 },
    height: { min: 320, max: 700 },
};

describe('resizeSize', () => {
    it('grows the popup when the left edge is dragged left', () => {
        expect(
            resizeSize(
                { width: 400, height: 520 },
                { width: -40, height: 0 },
                'left',
                range
            )
        ).toEqual({ width: 440, height: 520 });
    });

    it('clamps width and height when resizing the corner', () => {
        expect(
            resizeSize(
                { width: 400, height: 520 },
                { width: -500, height: 500 },
                'bottom-left',
                range
            )
        ).toEqual({ width: 520, height: 700 });
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
