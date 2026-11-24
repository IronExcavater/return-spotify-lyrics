import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../../helpers/css';

export type SpinnerProps = ComponentProps<'span'> & {
    /** The width and height. The default follows the font size. */
    size?: CssLength;
    /** What a screen reader says while the spinner shows. */
    label?: string;
};

/** Shows that something is loading. */
export default function Spinner({
    size = '1em',
    label = 'Loading',
    className,
    style,
    ...props
}: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            {...props}
            className={clsx('spinner', className)}
            style={{ '--spinner-size': toCssSize(size), ...style }}
        >
            <svg viewBox="0 0 24 24" aria-hidden data-part="ring">
                <circle cx="12" cy="12" r="10" data-part="track" />
                <circle cx="12" cy="12" r="10" data-part="arc" />
            </svg>
        </span>
    );
}
