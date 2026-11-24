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

type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';
type TextSize = 'small' | 'medium' | 'large' | 'x-large' | 'xx-large';
type TextWeight = 'regular' | 'medium' | 'bold' | 'black';
type TextTone =
    | 'default'
    | 'subdued'
    | 'faint'
    | 'accent'
    | 'negative'
    | 'warning'
    | 'info';

type SharedProps = Omit<
    ComponentProps<'p'>,
    'style' | 'children' | 'content'
> & {
    /** The role of the text. It sets the default size, weight, tone and element. A `label` names a control, like a button. */
    variant?: TextVariant;
    /** One of the theme's text sizes, in place of the variant's. */
    size?: TextSize | undefined;
    /** The font weight, in place of the variant's and the size's. */
    weight?: TextWeight | undefined;
    /** One of the theme's text colours, in place of the variant's. Without one, the text takes its parent's colour. */
    tone?: TextTone | undefined;
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

type MarkupProps = {
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

export type TextProps = SharedProps & (PlainProps | MarkupProps | DocProps);

type VariantDefaults = {
    element: 'h1' | 'h2' | 'p' | 'span';
    size?: TextSize;
    weight?: TextWeight;
    tone?: TextTone;
};

// A title and a heading are headings, so the page outline works. A label takes the size and colour of its control.
const VARIANTS: Record<TextVariant, VariantDefaults> = {
    title: { element: 'h1', size: 'xx-large' },
    heading: { element: 'h2', size: 'x-large' },
    body: { element: 'p', size: 'medium' },
    caption: { element: 'span', size: 'small', tone: 'subdued' },
    label: { element: 'span', weight: 'bold' },
};

/**
 * Renders text with the theme's typography. Plain children render as they are, so a string stays literal and an
 * icon sits inline at the text's size and colour. Markdown, HTML and Tiptap documents render through a lazy
 * formatter. A size, weight or tone prop replaces the variant's.
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
    const defaults = VARIANTS[variant];
    const markup = typeof children === 'string' ? children : '';
    const sourceFormat = content === undefined ? format : 'doc';
    const isFormatted = sourceFormat !== 'plain';
    let rendered: ReactNode = children;
    if (content !== undefined) {
        rendered = (
            <Suspense fallback={stripDoc(content)}>
                <FormattedText content={content} />
            </Suspense>
        );
    } else if (format !== 'plain') {
        rendered = (
            <Suspense fallback={stripMarkup(format, markup)}>
                <FormattedText format={format} markup={markup} />
            </Suspense>
        );
    }

    return useRender({
        render,
        // Formatted content has blocks of its own, like paragraphs and lists, so it needs a block container.
        defaultTagName: isFormatted ? 'div' : defaults.element,
        props: {
            dir: 'auto',
            ...props,
            children: rendered,
            className: clsx('text', className),
            'data-format': isFormatted ? sourceFormat : undefined,
            'data-variant': variant,
            'data-size': size ?? defaults.size,
            'data-weight': weight ?? defaults.weight,
            'data-tone': tone ?? defaults.tone,
            'data-clamped': lineClamp !== undefined || undefined,
            style: { '--text-lines': lineClamp, ...style },
        },
    });
}
