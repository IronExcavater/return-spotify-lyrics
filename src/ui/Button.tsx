import type { ComponentProps, ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { LoaderCircle } from 'lucide-react';
import clsx from 'clsx';

import { Badge, type BadgeTone } from './Badge';
import { Tooltip } from './Tooltip';

type BaseButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'>;

export type ButtonProps = BaseButtonProps & {
    variant?: 'solid' | 'ghost' | 'outline' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    radius?: 'none' | 'sm' | 'md' | 'full';
    icon?: ReactNode;
    iconOnly?: boolean;
    badge?: ReactNode;
    badgeTone?: BadgeTone;
    loading?: boolean;
    tooltip?: ReactNode;
    className?: string;
};

const variantClass = {
    solid: 'bg-accent text-black hover:brightness-105',
    ghost: 'bg-transparent text-text-muted hover:bg-surface-hover hover:text-text',
    outline: 'border border-border bg-transparent text-text hover:bg-surface-hover',
    danger: 'bg-danger text-white hover:brightness-105',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>;

const sizeClass = {
    xs: 'h-7 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
} satisfies Record<NonNullable<ButtonProps['size']>, string>;

const iconSizeClass = {
    xs: 'size-7 p-0',
    sm: 'size-8 p-0',
    md: 'size-10 p-0',
    lg: 'size-12 p-0',
} satisfies Record<NonNullable<ButtonProps['size']>, string>;

const radiusClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-control',
    full: 'rounded-full',
} satisfies Record<NonNullable<ButtonProps['radius']>, string>;

export function Button({
    variant = 'solid',
    size = 'md',
    radius = 'md',
    icon,
    iconOnly = false,
    badge,
    badgeTone = 'accent',
    loading = false,
    tooltip,
    disabled,
    className,
    children,
    'aria-label': ariaLabel,
    ...props
}: ButtonProps) {
    const resolvedLabel =
        ariaLabel ?? (iconOnly && typeof tooltip === 'string' ? tooltip : undefined);

    let control: ReactNode = (
        <BaseButton
            {...props}
            aria-label={resolvedLabel}
            disabled={disabled || loading}
            className={clsx(
                'inline-flex cursor-pointer items-center justify-center gap-2 font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50',
                variantClass[variant],
                iconOnly ? iconSizeClass[size] : sizeClass[size],
                radiusClass[radius],
                className
            )}
        >
            {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : icon}
            {children}
        </BaseButton>
    );

    if (tooltip) {
        control = <Tooltip content={tooltip}>{control as React.ReactElement}</Tooltip>;
    }

    if (badge !== undefined && badge !== null && badge !== false) {
        control = (
            <Badge
                content={badge === true ? undefined : badge}
                dot={badge === true}
                tone={badgeTone}
            >
                {control}
            </Badge>
        );
    }

    return control;
}
