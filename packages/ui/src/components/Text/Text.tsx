import {
    lazy,
    Suspense,
    type ComponentProps,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from 'react';
import { useRender } from '@base-ui/react/use-render';
import type { JSONContent } from '@tiptap/core';
import clsx from 'clsx';
import { stripDoc, stripMarkup } from './markup';

// Tiptap is large, so it loads only when a Text has formatted content.
const FormattedText = lazy(() => import('./FormattedText'));

type SharedProps = Omit<ComponentProps<'span'>, 'style' | 'children'> & {
    /** Shows only inline content, for the name of a control like a button. Formatted links and blocks become plain text. */
    inline?: boolean;
    /** The most lines to show. Longer text ends with an ellipsis, and assistive technology still gets all of it. */
    maxLines?: number | undefined;
    /** Another element to render, like `<h2 />` or `<p />`. */
    render?: ReactElement | undefined;
    style?: CSSProperties | undefined;
};

type PlainProps = {
    /** How to read the children: as they are, or as markdown or HTML. */
    format?: 'plain';
    children?: ReactNode;
    doc?: undefined;
};

type MarkupProps = {
    format: 'markdown' | 'html';
    /** Markdown or HTML. HTML keeps only the tags and attributes of the shared schema, so unsafe HTML can't run. */
    children: string;
    doc?: undefined;
};

type DocProps = {
    /** A Tiptap document, like a saved RichTextArea draft. */
    doc: JSONContent;
    format?: undefined;
    children?: undefined;
};

export type TextProps = SharedProps & (PlainProps | MarkupProps | DocProps);

/**
 * Shows text: plain children as they are, or markdown, HTML or a Tiptap document through a lazy formatter. It has no
 * typography of its own, so it takes its parent's, and classes like `text-large font-bold text-subdued` change it. An
 * icon in the text takes the text's size and colour.
 */
export default function Text({
    inline = false,
    maxLines,
    render,
    format = 'plain',
    doc,
    className,
    style,
    children,
    ...props
}: TextProps) {
    const markup = typeof children === 'string' ? children : '';
    const sourceFormat = doc === undefined ? format : 'doc';
    const isFormatted = sourceFormat !== 'plain';
    // Formatted content has blocks of its own, like paragraphs and lists, so it needs a block container.
    const hasBlocks = isFormatted && !inline;
    let rendered: ReactNode = children;
    if (doc !== undefined) {
        rendered = (
            <Suspense fallback={stripDoc(doc)}>
                <FormattedText doc={doc} inline={inline} />
            </Suspense>
        );
    } else if (format !== 'plain') {
        rendered = (
            <Suspense fallback={stripMarkup(format, markup)}>
                <FormattedText
                    format={format}
                    markup={markup}
                    inline={inline}
                />
            </Suspense>
        );
    }

    return useRender({
        render,
        defaultTagName: hasBlocks ? 'div' : 'span',
        props: {
            dir: 'auto',
            ...props,
            children: rendered,
            className: clsx('text', className),
            'data-format': isFormatted ? sourceFormat : undefined,
            'data-inline': inline || undefined,
            'data-clamped': maxLines !== undefined || undefined,
            style: { '--text-lines': maxLines, ...style },
        },
    });
}
