import { describe, expect, it } from 'vitest';
import { findLinkKind } from './href';

const ORIGIN = 'chrome-extension://abcdefghijklmnop';

describe('findLinkKind', () => {
    it('treats a path as a route in the app', () => {
        expect(findLinkKind('/album/4aawyAB9vmqN3uQ7FjRGTy', ORIGIN)).toBe(
            'internal'
        );
        expect(findLinkKind('settings', ORIGIN)).toBe('internal');
    });

    it('treats a web address on another origin as external', () => {
        expect(
            findLinkKind(
                'https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P',
                ORIGIN
            )
        ).toBe('external');
        // A protocol-relative address takes the page's scheme, so it's a web link only on a web page.
        expect(findLinkKind('//lrclib.net/docs', 'https://example.com')).toBe(
            'external'
        );
        expect(findLinkKind('//lrclib.net/docs', ORIGIN)).toBe('other');
    });

    it('leaves other schemes and in-page anchors to the browser', () => {
        expect(findLinkKind('mailto:support@example.com', ORIGIN)).toBe(
            'other'
        );
        expect(findLinkKind('#lyrics', ORIGIN)).toBe('other');
        expect(findLinkKind(`${ORIGIN}/popup.html`, ORIGIN)).toBe('other');
    });

    it('treats an address that does not parse as other', () => {
        expect(findLinkKind('https://', ORIGIN)).toBe('other');
    });
});
