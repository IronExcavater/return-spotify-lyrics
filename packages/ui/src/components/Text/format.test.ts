import { describe, expect, it } from 'vitest';
import { parseHtml, parseMarkdown, removeUnsafeLinks } from './format';

// The marks of each text node in a document, in order.
function marksOf(doc: ReturnType<typeof parseMarkdown>) {
    const marks: string[] = [];
    const visit = (node: typeof doc) => {
        for (const mark of node.marks ?? []) {
            marks.push(
                `${mark.type}${mark.attrs?.href ? `:${mark.attrs.href}` : ''}`
            );
        }
        node.content?.forEach(visit);
    };
    visit(doc);
    return marks;
}

describe('parseMarkdown', () => {
    it('turns markdown into formatted text', () => {
        const doc = parseMarkdown('Out **now** on _vinyl_');
        expect(marksOf(doc)).toEqual(['bold', 'italic']);
    });

    it('keeps a safe link', () => {
        const doc = parseMarkdown('[LRCLIB](https://lrclib.net)');
        expect(marksOf(doc)).toEqual(['link:https://lrclib.net']);
    });
});

describe('parseHtml', () => {
    it('drops scripts, event handlers and unsafe links', () => {
        const doc = parseHtml(
            '<p>Hi<script>alert(1)</script> <a href="javascript:alert(1)" onclick="steal()">there</a></p><img src="x" onerror="alert(1)">'
        );
        expect(JSON.stringify(doc)).not.toMatch(
            /script|onclick|onerror|javascript/
        );
        expect(marksOf(doc)).toEqual([]);
    });

    it('keeps the formatting of a playlist description', () => {
        const doc = parseHtml(
            'New music every Friday. Cover: <a href="https://open.spotify.com/artist/1">Ada Vale</a>'
        );
        expect(marksOf(doc)).toEqual([
            'link:https://open.spotify.com/artist/1',
        ]);
    });
});

describe('removeUnsafeLinks', () => {
    it('removes a link whose address can run code, and keeps its text', () => {
        const doc = removeUnsafeLinks(
            parseMarkdown('[Click](javascript:alert(1)) and [read](/album/1)')
        );
        expect(marksOf(doc)).toEqual(['link:/album/1']);
        expect(JSON.stringify(doc)).toContain('Click');
    });

    it('removes a scheme that hides behind a tab or a space, because browsers drop them', () => {
        const doc = removeUnsafeLinks({
            type: 'doc',
            content: [
                {
                    type: 'text',
                    text: 'Hidden',
                    marks: [
                        {
                            type: 'link',
                            attrs: { href: ' java\tscript:alert(1)' },
                        },
                    ],
                },
            ],
        });
        expect(marksOf(doc)).toEqual([]);
    });

    it('keeps web, mail and app links', () => {
        const doc = removeUnsafeLinks(
            parseMarkdown(
                '[a](https://a.com) [b](http://b.com) [c](mailto:c@d.com) [d](/home)'
            )
        );
        expect(marksOf(doc)).toHaveLength(4);
    });
});
