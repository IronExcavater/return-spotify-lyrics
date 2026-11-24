import type { ComponentProps, CSSProperties, ReactElement } from 'react';
import { useRender } from '@base-ui/react/use-render';
import clsx from 'clsx';

type TextVariant = 'title' | 'heading' | 'body' | 'caption';

export type TextProps = Omit<ComponentProps<'p'>, 'style'> & {
    /** The role of the text. It sets the default size, weight, tone and element. */
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

// A title and a heading are headings by default, so the page outline works with no extra props.
const ELEMENTS: Record<TextVariant, 'h1' | 'h2' | 'p' | 'span'> = {
    title: 'h1',
    heading: 'h2',
    body: 'p',
    caption: 'span',
};

/**
 * Renders text with the theme's typography. Children render as they are, so a string stays literal and an icon
 * sits inline at the text's size and colour. The size, weight and tone default to the variant's in CSS.
 */
export default function Text({
    variant = 'body',
    size,
    weight,
    tone,
    lineClamp,
    render,
    className,
    style,
    ...props
}: TextProps) {
    return useRender({
        render,
        defaultTagName: ELEMENTS[variant],
        props: {
            dir: 'auto',
            ...props,
            className: clsx('text', className),
            'data-variant': variant,
            'data-size': size,
            'data-weight': weight,
            'data-tone': tone,
            'data-clamped': lineClamp !== undefined || undefined,
            style: { '--text-lines': lineClamp, ...style },
        },
    });
}
