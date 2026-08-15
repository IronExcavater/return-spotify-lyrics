import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export type CardProps = ComponentPropsWithoutRef<'div'> & {
    variant?: 'surface' | 'raised' | 'outline' | 'ghost';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
};

const variantClass = {
    surface: 'bg-surface',
    raised: 'bg-surface-raised shadow-lg shadow-black/15',
    outline: 'border border-border bg-transparent',
    ghost: 'bg-transparent',
} satisfies Record<NonNullable<CardProps['variant']>, string>;

const paddingClass = {
    none: '',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-5',
} satisfies Record<NonNullable<CardProps['padding']>, string>;

export function Card({
    variant = 'surface',
    padding = 'md',
    interactive = false,
    className,
    ...props
}: CardProps) {
    return (
        <div
            {...props}
            className={clsx(
                'rounded-panel',
                variantClass[variant],
                paddingClass[padding],
                interactive &&
                    'transition focus-within:ring-2 focus-within:ring-white/60 hover:bg-surface-hover',
                className
            )}
        />
    );
}
