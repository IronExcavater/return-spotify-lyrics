import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
    mergePersistedSize,
    RESIZE_EDGES,
    Resizable,
    resizeSize,
    resolveResizeEdges,
    type ResizeEdge,
} from './Resizable';

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

    it('does not convert non-numeric dimensions to numbers', () => {
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

describe('resolveResizeEdges', () => {
    it('uses all edges and corners when both dimensions can resize', () => {
        expect(
            resolveResizeEdges(
                { width: 400, height: 520 },
                { width: true, height: true }
            )
        ).toEqual(RESIZE_EDGES);
    });

    it('uses only horizontal edges when only width can resize', () => {
        expect(
            resolveResizeEdges(
                { width: 400, height: 520 },
                { width: true, height: false }
            )
        ).toEqual(['right', 'left']);
    });

    it('removes handles that need a non-numeric dimension', () => {
        expect(
            resolveResizeEdges(
                { width: 400, height: 'auto' },
                { width: true, height: true }
            )
        ).toEqual(['right', 'left']);
    });
});

describe('mergePersistedSize', () => {
    it('persists only the dimensions enabled by the caller', () => {
        expect(
            mergePersistedSize(
                { width: 400, height: 520 },
                { width: 460, height: 600 },
                { width: true, height: false }
            )
        ).toEqual({ width: 460, height: 520 });
    });
});

describe('Resizable', () => {
    it('renders all edge and corner handles by default', () => {
        const markup = renderToStaticMarkup(
            <Resizable size={{ width: 400, height: 520 }} range={range}>
                <div>Content</div>
            </Resizable>
        );

        for (const edge of RESIZE_EDGES) {
            expect(markup).toContain(`data-resize-edge="${edge}"`);
        }
    });

    it('renders only the dimensions enabled by resize', () => {
        const markup = renderToStaticMarkup(
            <Resizable
                size={{ width: 400, height: 520 }}
                range={range}
                resize={{ width: true, height: false }}
            >
                <div>Content</div>
            </Resizable>
        );

        expect(markup).toContain('data-resize-edge="left"');
        expect(markup).toContain('data-resize-edge="right"');
        expect(markup).not.toContain('data-resize-edge="top"');
        expect(markup).not.toContain('data-resize-edge="bottom"');
        expect(markup).not.toContain('data-resize-edge="top-left"');
    });
});
