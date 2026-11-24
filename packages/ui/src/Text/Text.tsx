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
import { textOfDoc, toPlainText } from './markup';

// Tiptap is large, so it loads only when a Text has formatted content.
const FormattedText = lazy(() => import('./FormattedText'));

type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

type SharedProps = Omit<
    ComponentProps<'p'>,
    'style' | 'children' | 'content'
> & {
    /** The role of the text. It sets the default size, weight, tone and element. A `label` names a control, like a button. */
    variant?: TextVariant;
    /** One of the theme's text sizes, in place of the variant's. */
    size?: 'small' | 'medium' | 'large' | 'x-large' | 'xx-large' | undefined;
    /** The font weight, in place of the variant's. */
    weight?: 'regular' | 'medium' | 'bold' | 'black' | undefined;
    /** One of the theme's text colours, in place of the variant's. */
    tone?:
        | 'default'
        | 'subdued'
        | 'faint'
        | 'accent'
        | 'negative'
        | 'warning'
        | 'info'
        | undefined;
    /** The most lines to show. Longer text ends with an ellipsis, and assistive technology still gets all of it. */
    lineClamp?: number | undefined;
    /** Another element to render, like `<h1 />`. */
    render?: ReactElement | undefined;
    style?: CSSProperties | undefined;
};

type PlainProps = {
    /** How to read the children: as they are, or as markdown or HTML. */
    format?: 'plain';
    children?: ReactNode;
    content?: undefined;
};

type SourceProps = {
    format: 'markdown' | 'html';
    /** Markdown or HTML. HTML keeps only the tags and attributes of the shared schema, so unsafe HTML can't run. */
    children: string;
    content?: undefined;
};

type DocProps = {
    /** A Tiptap document, like a saved RichTextArea draft. */
    content: JSONContent;
    format?: undefined;
    children?: undefined;
};

export type TextProps = SharedProps & (PlainProps | SourceProps | DocProps);

// A title and a heading are headings by default, so the page outline works with no extra props.
const ELEMENTS: Record<TextVariant, 'h1' | 'h2' | 'p' | 'span'> = {
    title: 'h1',
    heading: 'h2',
    body: 'p',
    caption: 'span',
    label: 'span',
};

/**
 * Renders text with the theme's typography. Plain children render as they are, so a string stays literal and an
 * icon sits inline at the text's size and colour. Markdown, HTML and Tiptap documents render through a lazy
 * formatter. The size, weight and tone default to the variant's in CSS.
 */
export default function Text({
    variant = 'body',
    size,
    weight,
    tone,
    lineClamp,
    render,
    format = 'plain',
    content,
    className,
    style,
    children,
    ...props
}: TextProps) {
    const source = typeof children === 'string' ? children : '';
    const isFormatted = content !== undefined || format !== 'plain';
    let body: ReactNode = children;
    if (content !== undefined) {
        body = (
            <Suspense fallback={textOfDoc(content)}>
                <FormattedText content={content} />
            </Suspense>
        );
    } else if (format !== 'plain') {
        body = (
            <Suspense fallback={toPlainText(format, source)}>
                <FormattedText format={format} source={source} />
            </Suspense>
        );
    }

    return useRender({
        render,
        // Formatted content has blocks of its own, like paragraphs and lists, so it needs a block container.
        defaultTagName: isFormatted ? 'div' : ELEMENTS[variant],
        props: {
            dir: 'auto',
            ...props,
            children: body,
            className: clsx('text', className),
            'data-format': isFormatted
                ? content
                    ? 'rich'
                    : format
                : undefined,
            'data-variant': variant,
            'data-size': size,
            'data-weight': weight,
            'data-tone': tone,
            'data-clamped': lineClamp !== undefined || undefined,
            style: { '--text-lines': lineClamp, ...style },
        },
    });
}
