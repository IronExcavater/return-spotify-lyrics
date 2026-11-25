import { Separator as BaseSeparator } from '@base-ui/react/separator';
import clsx from 'clsx';

export type SeparatorProps = Omit<BaseSeparator.Props, 'className'> & {
    /** Hides the line from assistive technology, when it only decorates and doesn't split two parts of the page. */
    decorative?: boolean;
    className?: string | undefined;
};

/** A thin line between two parts of a page or a group, on Base UI's `Separator`. */
export default function Separator({
    orientation = 'horizontal',
    decorative = false,
    className,
    ...props
}: SeparatorProps) {
    // A decorative line has no meaning, so it gives up the separator role and its orientation.
    const decorativeProps = decorative
        ? { role: 'none', 'aria-hidden': true, 'aria-orientation': undefined }
        : {};

    return (
        <BaseSeparator
            {...props}
            {...decorativeProps}
            orientation={orientation}
            className={clsx('separator', className)}
        />
    );
}
