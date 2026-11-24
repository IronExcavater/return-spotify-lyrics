import type { JSONContent } from '@tiptap/core';
import { generateJSON } from '@tiptap/html';
import { MarkdownManager } from '@tiptap/markdown';
import { TEXT_EXTENSIONS } from './schema';

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const SAFE_SCHEME = /^(https?|mailto):/i;

// This module loads only with formatted Text, so the parser is built once, on the first formatted Text.
const markdown = new MarkdownManager({ extensions: TEXT_EXTENSIONS });

/** Turns markdown into a Tiptap document. */
export function parseMarkdown(source: string): JSONContent {
    return markdown.parse(source);
}

/** Turns HTML into a Tiptap document. Only the tags and attributes of the schema stay. */
export function parseHtml(source: string): JSONContent {
    return generateJSON(source, TEXT_EXTENSIONS) as JSONContent;
}

/** Removes each link whose address can run code, like `javascript:`, and keeps its text. */
export function removeUnsafeLinks(node: JSONContent): JSONContent {
    const marks = node.marks?.filter(
        (mark) => mark.type !== 'link' || isSafeHref(mark.attrs?.['href'])
    );
    return {
        ...node,
        ...(marks && { marks }),
        ...(node.content && { content: node.content.map(removeUnsafeLinks) }),
    };
}

// Browsers drop tabs, line breaks and leading spaces from an address, so the check drops them first.
function isSafeHref(href: unknown): boolean {
    if (typeof href !== 'string') return false;
    const address = href.replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, '');
    return !SCHEME.test(address) || SAFE_SCHEME.test(address);
}
