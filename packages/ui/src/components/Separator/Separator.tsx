import type { CSSProperties, ReactNode } from 'react';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../../helpers/css';

export type SeparatorProps = Omit<
    BaseSeparator.Props,
    'className' | 'children' | 'style'
> & {
    /** The mark: a line, a dot, a cross, a slash, or only space. */
    variant?: 'line' | 'dot' | 'cross' | 'slash' | 'space';
    /** The size of the mark: the thickness of a line, or the width of a dot, cross or slash. The variant sets a default. */
    size?: CssLength | undefined;
    /** The space on each side of the mark, across the line of content that it splits. The variant sets a default. */
    gap?: CssLength | undefined;
    /** Hides the mark from assistive technology, when it only decorates and doesn't split two parts of the page. */
    decorative?: boolean;
    /** A mark of your own, like an icon, in place of the variant's mark. Then the variant has no effect. */
    children?: ReactNode;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

/**
 * A mark between two parts of a page, a list or a line of text, on Base UI's `Separator`. A vertical separator splits
 * things in a row, like the parts of a track's details, and a horizontal one splits things in a column.
 */
export default function Separator({
    orientation = 'horizontal',
    variant = 'line',
    size,
    gap,
    decorative = false,
    children,
    className,
    style,
    ...props
}: SeparatorProps) {
    const isCustom = children !== undefined;
    // A decorative mark has no meaning, so it gives up the separator role and its orientation.
    const decorativeProps = decorative
        ? { role: 'none', 'aria-hidden': true, 'aria-orientation': undefined }
        : {};

    return (
        <BaseSeparator
            {...props}
            {...decorativeProps}
            orientation={orientation}
            className={clsx('separator', className)}
            data-variant={isCustom ? 'custom' : variant}
            style={{
                '--separator-size':
                    size === undefined ? undefined : toCssSize(size),
                '--separator-gap':
                    gap === undefined ? undefined : toCssSize(gap),
                ...style,
            }}
        >
            <span data-part="mark">{children}</span>
        </BaseSeparator>
    );
}
