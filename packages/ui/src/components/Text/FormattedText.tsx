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

const BLOCK_OPTIONS = { markMapping: { link: LinkMark } };
// After flattenDoc, the one paragraph renders as its content, so a control holds no block.
const INLINE_OPTIONS = { nodeMapping: { paragraph: BareParagraph } };

// Text and hard breaks are the inline nodes, and every other node holds blocks.
const INLINE_NODES = new Set(['text', 'hardBreak']);

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

/** Joins the blocks of a document into one paragraph of inline content without links, for the name of a control. */
export function flattenDoc(doc: JSONContent): JSONContent {
    const content = collectLines(doc).flatMap((line, index) =>
        index === 0 ? line : [{ type: 'text', text: ' ' }, ...line]
    );
    return { type: 'doc', content: [{ type: 'paragraph', content }] };
}

// A line is the inline content of one block, like a paragraph, a heading or a list item.
function collectLines(node: JSONContent): JSONContent[][] {
    const children = node.content ?? [];
    const isLine = children.some((child) => INLINE_NODES.has(child.type ?? ''));
    if (isLine) return [children.map(removeLink)];
    return children.flatMap(collectLines);
}

function removeLink(node: JSONContent): JSONContent {
    const marks = node.marks?.filter((mark) => mark.type !== 'link');
    return { ...node, ...(marks && { marks }) };
}

type FormattedTextProps = (
    | { format: 'markdown' | 'html'; markup: string; doc?: undefined }
    | { doc: JSONContent; format?: undefined; markup?: undefined }
) & {
    inline: boolean;
};

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

type BareParagraphProps = {
    children?: ReactNode;
};

function BareParagraph({ children }: BareParagraphProps) {
    return <>{children}</>;
}

/** Renders markdown, HTML or a Tiptap document with the static renderer, so no editor loads. Text loads it lazily. */
export default function FormattedText({
    format,
    markup,
    doc,
    inline,
}: FormattedTextProps) {
    // Parsing takes time, so a new render with the same source keeps the document.
    const content = useMemo(() => {
        const parsed =
            doc ??
            (format === 'html' ? parseHtml(markup) : parseMarkdown(markup));
        const safe = removeUnsafeLinks(parsed);
        return inline ? flattenDoc(safe) : safe;
    }, [format, markup, doc, inline]);

    return renderToReactElement({
        content,
        extensions: TEXT_EXTENSIONS,
        options: inline ? INLINE_OPTIONS : BLOCK_OPTIONS,
    });
}
