import type { MouseEventHandler, ReactElement, ReactNode } from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { Button as BaseButton } from '@base-ui/react/button';
import clsx from 'clsx';

import { Badge, type BadgeTone } from './Badge';
import { Tooltip } from './Tooltip';

export type AvatarProps = {
    src?: string | null;
    alt?: string;
    fallback?: ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    radius?: 'none' | 'sm' | 'md' | 'full';
    badge?: ReactNode;
    badgeTone?: BadgeTone;
    loading?: boolean;
    disabled?: boolean;
    selected?: boolean;
    tooltip?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    'aria-label'?: string;
};

const sizeClass = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
    xl: 'size-16 text-lg',
} satisfies Record<NonNullable<AvatarProps['size']>, string>;

const radiusClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-control',
    full: 'rounded-full',
} satisfies Record<NonNullable<AvatarProps['radius']>, string>;

export function Avatar({
    src,
    alt = '',
    fallback = '?',
    size = 'md',
    radius = 'full',
    badge,
    badgeTone = 'accent',
    loading = false,
    disabled = false,
    selected = false,
    tooltip,
    onClick,
    className,
    'aria-label': ariaLabel,
}: AvatarProps) {
    const avatar = (
        <BaseAvatar.Root
            className={clsx(
                'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-surface-raised font-semibold text-text-muted',
                sizeClass[size],
                radiusClass[radius],
                loading && 'animate-pulse',
                className
            )}
        >
            {src && (
                <BaseAvatar.Image
                    src={src}
                    alt={alt}
                    className="size-full object-cover"
                />
            )}
            <BaseAvatar.Fallback className="flex size-full items-center justify-center">
                {fallback}
            </BaseAvatar.Fallback>
        </BaseAvatar.Root>
    );

    const interactive = typeof onClick === 'function';
    const resolvedLabel =
        ariaLabel ??
        (typeof tooltip === 'string'
            ? tooltip
            : typeof fallback === 'string'
              ? fallback
              : undefined);

    let control: ReactElement = interactive ? (
        <BaseButton
            type="button"
            aria-label={resolvedLabel}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                'inline-flex shrink-0 cursor-pointer rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50',
                selected && 'ring-2 ring-accent'
            )}
        >
            {avatar}
        </BaseButton>
    ) : (
        avatar
    );

    if (tooltip) control = <Tooltip content={tooltip}>{control}</Tooltip>;

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
