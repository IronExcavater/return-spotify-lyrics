import type { JSONContent } from '@tiptap/core';
import { generateJSON } from '@tiptap/html';
import { MarkdownManager } from '@tiptap/markdown';
import { TEXT_EXTENSIONS } from './schema';

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
// A relative address resolves against this base, so it counts as a web address.
const BASE = 'https://relative.invalid';

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

// The URL parser drops tabs, line breaks and leading spaces as a browser does, so a hidden scheme shows.
function isSafeHref(href: unknown): boolean {
    if (typeof href !== 'string') return false;
    const url = URL.parse(href, BASE);
    return url !== null && SAFE_PROTOCOLS.has(url.protocol);
}
