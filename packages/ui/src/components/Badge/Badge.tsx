import type { ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import Text from '../Text/Text';
import { formatCount } from './count';

type SharedProps = Omit<ComponentProps<'span'>, 'children'> & {
    /** The colour intent: the accent green, white, or red for something that needs attention. */
    tone?: 'accent' | 'neutral' | 'negative';
    /** The height and text size. */
    size?: 'small' | 'medium';
};

type CountProps = {
    /** A number to show, like new episodes. */
    count: number;
    /** The highest count to show before a plus, like 99+. */
    max?: number;
    dot?: false;
    children?: undefined;
};

type LabelProps = {
    children: ReactNode;
    count?: undefined;
    max?: undefined;
    dot?: false;
};

// A dot shows no text, so its type requires a name for assistive technology.
type DotProps = {
    /** Shows only a dot, like a mark for something new. */
    dot: true;
    'aria-label': string;
    count?: undefined;
    max?: undefined;
    children?: undefined;
};

export type BadgeProps = SharedProps & (CountProps | LabelProps | DotProps);

/** A small mark with a count, a short label or only a dot. */
export default function Badge({
    tone = 'accent',
    size = 'medium',
    count,
    max = 99,
    dot = false,
    className,
    children,
    ...props
}: BadgeProps) {
    const shared = {
        className: clsx('badge', className),
        'data-tone': tone,
        'data-size': size,
    };
    if (dot) return <span role="img" {...props} {...shared} data-dot="" />;

    const content = count === undefined ? children : formatCount(count, max);
    return (
        <span {...props} {...shared}>
            <Text inline>{content}</Text>
        </span>
    );
}
