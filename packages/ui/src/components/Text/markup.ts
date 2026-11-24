import type { JSONContent } from '@tiptap/core';

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    '#39': "'",
    nbsp: ' ',
};

// Paragraphs and headings hold inline text, and every other node holds blocks on lines of their own.
const INLINE_PARENTS = new Set(['paragraph', 'heading']);

/** The words of markdown or HTML without the markup, to show while the formatter loads. */
export function stripMarkup(
    format: 'markdown' | 'html',
    markup: string
): string {
    return format === 'html' ? stripHtml(markup) : stripMarkdown(markup);
}

/** The words of a Tiptap document, to show while the formatter loads. */
export function stripDoc(node: JSONContent): string {
    if (node.text !== undefined) return node.text;
    const separator = INLINE_PARENTS.has(node.type ?? '') ? '' : '\n';
    return (node.content ?? []).map(stripDoc).join(separator);
}

function stripMarkdown(markup: string): string {
    return markup
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
        .replace(/\*\*|__|~~|[*_`]/g, '')
        .trim();
}

// One pass decodes each entity once, so `&amp;lt;` becomes `&lt;` and not `<`.
function stripHtml(markup: string): string {
    return markup
        .replace(/<[^>]*>/g, '')
        .replace(
            /&(amp|lt|gt|quot|#39|nbsp);/g,
            (_, name: string) => ENTITIES[name] ?? ''
        )
        .trim();
}
