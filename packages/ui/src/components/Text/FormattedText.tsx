import { useMemo, type ReactNode } from 'react';
import type { Extensions, JSONContent } from '@tiptap/core';
import { generateJSON } from '@tiptap/html';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import Link from '../Link/Link';

// Everything that needs Tiptap lives in this module, so Text loads it as one lazy chunk.

// RichTextArea will use the same extensions, so reading and editing render the same.
const TEXT_EXTENSIONS: Extensions = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
    }),
];

const RENDER_OPTIONS = { markMapping: { link: LinkMark } };

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
// A relative address resolves against this base, so it counts as a web address.
const RELATIVE_BASE = 'https://relative.invalid';

// This module loads only with formatted Text, so the parser is built once, on the first formatted Text.
const markdownParser = new MarkdownManager({ extensions: TEXT_EXTENSIONS });

/** Turns markdown into a Tiptap document. */
export function parseMarkdown(markup: string): JSONContent {
    return markdownParser.parse(markup);
}

/** Turns HTML into a Tiptap document. Only the tags and attributes of the schema stay. */
export function parseHtml(markup: string): JSONContent {
    return generateJSON(markup, TEXT_EXTENSIONS) as JSONContent;
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
    const url = URL.parse(href, RELATIVE_BASE);
    return url !== null && SAFE_PROTOCOLS.has(url.protocol);
}

type FormattedTextProps =
    | { format: 'markdown' | 'html'; markup: string; content?: undefined }
    | { content: JSONContent; format?: undefined; markup?: undefined };

type LinkMarkProps = {
    mark: { attrs: Record<string, unknown> };
    children?: ReactNode;
};

// A link in formatted text sits in a sentence, so it always has an underline.
function LinkMark({ mark, children }: LinkMarkProps) {
    return (
        <Link href={String(mark.attrs['href'] ?? '')} underline="always">
            {children}
        </Link>
    );
}

/** Renders markdown, HTML or a Tiptap document with the static renderer, so no editor loads. Text loads it lazily. */
export default function FormattedText({
    format,
    markup,
    content,
}: FormattedTextProps) {
    // Parsing takes time, so a new render with the same markup keeps the document.
    const doc = useMemo(() => {
        const parsed =
            content ??
            (format === 'html' ? parseHtml(markup) : parseMarkdown(markup));
        return removeUnsafeLinks(parsed);
    }, [format, markup, content]);

    return renderToReactElement({
        content: doc,
        extensions: TEXT_EXTENSIONS,
        options: RENDER_OPTIONS,
    });
}
