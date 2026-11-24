import { useMemo, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import Link from '../Link/Link';
import { parseHtml, parseMarkdown, removeUnsafeLinks } from './format';
import { TEXT_EXTENSIONS } from './schema';

type FormattedTextProps =
    | { format: 'markdown' | 'html'; source: string; content?: undefined }
    | { content: JSONContent; format?: undefined; source?: undefined };

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

const OPTIONS = { markMapping: { link: LinkMark } };

/** Renders markdown, HTML or a Tiptap document with the static renderer, so no editor loads. Text loads it lazily. */
export default function FormattedText({
    format,
    source,
    content,
}: FormattedTextProps) {
    // Parsing takes time, so a new render with the same source keeps the document.
    const doc = useMemo(() => {
        const parsed =
            content ??
            (format === 'html' ? parseHtml(source) : parseMarkdown(source));
        return removeUnsafeLinks(parsed);
    }, [format, source, content]);

    return renderToReactElement({
        content: doc,
        extensions: TEXT_EXTENSIONS,
        options: OPTIONS,
    });
}
