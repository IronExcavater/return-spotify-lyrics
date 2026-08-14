import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
    Marquee,
    getMarqueeCopyCount,
    getMarqueeDistance,
    shouldMarqueeScroll,
} from './Marquee';

describe('shouldMarqueeScroll', () => {
    it('scrolls only when content overflows by default', () => {
        expect(shouldMarqueeScroll(320, 200, false)).toBe(true);
        expect(shouldMarqueeScroll(180, 200, false)).toBe(false);
    });

    it('can force continuous scrolling when content fits', () => {
        expect(shouldMarqueeScroll(180, 200, true)).toBe(true);
    });
});

describe('getMarqueeCopyCount', () => {
    it('keeps an explicit clone count', () => {
        expect(getMarqueeCopyCount(3, 400, 120)).toBe(3);
    });

    it('creates enough automatic clones to continuously fill the viewport', () => {
        expect(getMarqueeCopyCount('auto', 400, 100)).toBe(5);
    });

    it('always keeps at least one clone for continuous scrolling', () => {
        expect(getMarqueeCopyCount(0, 200, 100)).toBe(1);
    });
});

describe('getMarqueeDistance', () => {
    it('travels one complete repeated unit for continuous modes', () => {
        expect(getMarqueeDistance('left', 320, 200, 24)).toBe(344);
        expect(getMarqueeDistance('right', 320, 200, 24)).toBe(344);
    });

    it('travels only the overflow distance when bouncing', () => {
        expect(getMarqueeDistance('bounce', 320, 200, 24)).toBe(120);
    });
});

describe('Marquee', () => {
    it('keeps consumer margin and padding on the outer element', () => {
        const markup = renderToStaticMarkup(
            <Marquee className="ml-2 px-3" maxWidth={240}>
                Track title
            </Marquee>
        );

        expect(markup).toContain('ml-2');
        expect(markup).toContain('px-3');
        expect(markup).toContain('max-width:240px');
        expect(markup).toContain('data-marquee-viewport="true"');
    });

    it('renders a single accessible original before measurement', () => {
        const markup = renderToStaticMarkup(<Marquee>Track title</Marquee>);

        expect(markup).toContain('data-marquee-copy="0"');
        expect(markup.match(/Track title/g)).toHaveLength(1);
    });
});
