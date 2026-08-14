import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
    mergeStoredDimensions,
    RESIZE_HANDLES,
    Resizable,
    resizeDimensions,
    resolveResizeHandles,
    type ResizeHandle,
} from './Resizable';

function resize(handle: string, deltaX: number, deltaY: number) {
    return resizeDimensions(
        { width: 400, height: 520 },
        deltaX,
        deltaY,
        handle as ResizeHandle,
        350,
        520,
        320,
        700
    );
}

describe('resizeDimensions', () => {
    it('grows width when the left handle is dragged left', () => {
        expect(resize('left', -40, 0)).toEqual({ width: 440, height: 520 });
    });

    it('grows width when the right handle is dragged right', () => {
        expect(resize('right', 40, 0)).toEqual({ width: 440, height: 520 });
    });

    it('grows height when the top handle is dragged up', () => {
        expect(resize('top', 0, -40)).toEqual({ width: 400, height: 560 });
    });

    it('grows height when the bottom handle is dragged down', () => {
        expect(resize('bottom', 0, 40)).toEqual({ width: 400, height: 560 });
    });

    it.each([
        ['top-left', -40, -40, { width: 440, height: 560 }],
        ['top-right', 40, -40, { width: 440, height: 560 }],
        ['bottom-left', -40, 40, { width: 440, height: 560 }],
        ['bottom-right', 40, 40, { width: 440, height: 560 }],
    ])('resizes from the %s corner', (handle, deltaX, deltaY, expected) => {
        expect(resize(handle, deltaX, deltaY)).toEqual(expected);
    });

    it('clamps width and height', () => {
        expect(resize('bottom-left', -500, 500)).toEqual({
            width: 520,
            height: 700,
        });
    });

    it('leaves auto dimensions alone', () => {
        expect(
            resizeDimensions(
                { width: 320, height: 'auto' },
                20,
                100,
                'bottom',
                300,
                500,
                300,
                700
            )
        ).toEqual({ width: 320, height: 'auto' });
    });
});

describe('resolveResizeHandles', () => {
    it('uses all handles when resizing both dimensions', () => {
        expect(resolveResizeHandles(400, 520, 'both')).toEqual(RESIZE_HANDLES);
    });

    it('uses only left and right for horizontal resizing', () => {
        expect(resolveResizeHandles(400, 520, 'horizontal')).toEqual([
            'right',
            'left',
        ]);
    });

    it('removes handles that require an auto dimension', () => {
        expect(resolveResizeHandles(400, 'auto', 'both')).toEqual([
            'right',
            'left',
        ]);
    });
});

describe('mergeStoredDimensions', () => {
    it('remembers only the requested dimensions', () => {
        expect(
            mergeStoredDimensions(
                { width: 400, height: 520 },
                { width: 460, height: 600 },
                'horizontal'
            )
        ).toEqual({ width: 460, height: 520 });
    });
});

describe('Resizable', () => {
    it('renders all handles by default', () => {
        const markup = renderToStaticMarkup(
            <Resizable
                width={400}
                height={520}
                minWidth={350}
                maxWidth={520}
                minHeight={320}
                maxHeight={700}
            >
                <div>Content</div>
            </Resizable>
        );

        for (const handle of RESIZE_HANDLES) {
            expect(markup).toContain(`data-resize-handle="${handle}"`);
        }
    });

    it('renders only horizontal handles when requested', () => {
        const markup = renderToStaticMarkup(
            <Resizable width={400} height={520} resize="horizontal">
                <div>Content</div>
            </Resizable>
        );

        expect(markup).toContain('data-resize-handle="left"');
        expect(markup).toContain('data-resize-handle="right"');
        expect(markup).not.toContain('data-resize-handle="top"');
        expect(markup).not.toContain('data-resize-handle="bottom"');
        expect(markup).not.toContain('data-resize-handle="top-left"');
    });
});
