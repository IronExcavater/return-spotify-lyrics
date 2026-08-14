import type { ComponentProps } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import clsx from 'clsx';

type BaseButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'>;

export type ButtonProps = BaseButtonProps & {
    variant?: 'solid' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    className?: string;
};

const variantClass = {
    solid: 'bg-accent text-black hover:brightness-105',
    ghost: 'bg-transparent text-text-muted hover:bg-surface-hover hover:text-text',
    danger: 'bg-danger text-white hover:brightness-105',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>;

const sizeClass = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
} satisfies Record<NonNullable<ButtonProps['size']>, string>;

export function Button({
    variant = 'solid',
    size = 'md',
    className,
    ...props
}: ButtonProps) {
    return (
        <BaseButton
            {...props}
            className={clsx(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50',
                variantClass[variant],
                sizeClass[size],
                className
            )}
        />
    );
}
