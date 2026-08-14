import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export type SeparatorProps = ComponentPropsWithoutRef<'div'> & {
    orientation?: 'horizontal' | 'vertical';
};

export function Separator({
    orientation = 'horizontal',
    className,
    ...props
}: SeparatorProps) {
    return (
        <div
            role="separator"
            aria-orientation={orientation}
            {...props}
            className={clsx(
                'shrink-0 bg-border',
                orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
                className
            )}
        />
    );
}
