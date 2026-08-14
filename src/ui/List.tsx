import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export type ListProps = ComponentPropsWithoutRef<'div'> & {
    gap?: 'none' | 'xs' | 'sm' | 'md';
};

const gapClass = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
} satisfies Record<NonNullable<ListProps['gap']>, string>;

export function List({ gap = 'sm', className, ...props }: ListProps) {
    return (
        <div
            role="list"
            {...props}
            className={clsx('flex min-w-0 flex-col', gapClass[gap], className)}
        />
    );
}

export type ListItemProps = ComponentPropsWithoutRef<'div'> & {
    interactive?: boolean;
};

export function ListItem({
    interactive = false,
    className,
    ...props
}: ListItemProps) {
    return (
        <div
            role="listitem"
            {...props}
            className={clsx(
                'min-w-0 rounded-control',
                interactive && 'transition hover:bg-surface-hover',
                className
            )}
        />
    );
}
