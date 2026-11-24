import { describe, expect, it } from 'vitest';
import { textOfDoc, toPlainText } from './markup';

describe('toPlainText', () => {
    it('removes markdown syntax and keeps the words', () => {
        expect(
            toPlainText(
                'markdown',
                '## New **single** _out_ now — [listen](https://open.spotify.com) `today`'
            )
        ).toBe('New single out now — listen today');
    });

    it('removes list and quote markers at the start of a line', () => {
        expect(toPlainText('markdown', '- one\n> two\n1. three')).toBe(
            'one\ntwo\nthree'
        );
    });

    it('removes HTML tags and decodes common entities', () => {
        expect(
            toPlainText('html', '<p>Rock &amp; roll <a href="/x">hits</a></p>')
        ).toBe('Rock & roll hits');
    });
});

describe('textOfDoc', () => {
    it('joins the text of a document', () => {
        expect(
            textOfDoc({
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            { type: 'text', text: 'Paper ' },
                            { type: 'text', text: 'boats' },
                        ],
                    },
                ],
            })
        ).toBe('Paper boats');
    });
});
