import type { ComponentProps } from 'react';
import { LoaderCircle } from 'lucide-react';
import clsx from 'clsx';

export type SpinnerProps = Omit<ComponentProps<typeof LoaderCircle>, 'size'> & {
    size?: 'xs' | 'sm' | 'md' | 'lg' | number;
    label?: string;
};

const sizePixels = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 28,
};

export function Spinner({
    size = 'md',
    label = 'Loading',
    className,
    ...props
}: SpinnerProps) {
    const pixels = typeof size === 'number' ? size : sizePixels[size];

    return (
        <LoaderCircle
            role="status"
            aria-label={label}
            size={pixels}
            {...props}
            className={clsx('animate-spin', className)}
        />
    );
}
