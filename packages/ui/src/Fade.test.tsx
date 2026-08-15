import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Fade, createFadeMask } from './Fade';

describe('createFadeMask', () => {
    it('builds a horizontal mask', () => {
        const mask = createFadeMask('horizontal', 12);
        expect(mask).toBeDefined();

        expect(mask!).toContain('to right');
        expect(mask!).toContain('to left');
        expect(mask!).toContain('12px');
    });

    it('builds an omni-directional mask from all four edges', () => {
        const mask = createFadeMask('all', '1rem');
        expect(mask).toBeDefined();

        expect(mask!.match(/linear-gradient/g)).toHaveLength(4);
        expect(mask!).toContain('to right');
        expect(mask!).toContain('to left');
        expect(mask!).toContain('to bottom');
        expect(mask!).toContain('to top');
        expect(mask!).toContain('1rem');
    });

    it('returns no mask for none', () => {
        expect(createFadeMask('none', 8)).toBeUndefined();
    });
});

describe('Fade', () => {
    it('keeps border-radius classes on the same masked element', () => {
        const markup = renderToStaticMarkup(
            <Fade fade="all" size={16} className="rounded-full">
                Artwork
            </Fade>
        );

        expect(markup).toContain('rounded-full');
        expect(markup).toContain('overflow-hidden');
        expect(markup).toContain('mask-image');
    });

    it('can be disabled without removing its layout wrapper', () => {
        const markup = renderToStaticMarkup(
            <Fade enabled={false} fade="all" className="w-full">
                Content
            </Fade>
        );

        expect(markup).toContain('w-full');
        expect(markup).not.toContain('mask-image');
    });
});
