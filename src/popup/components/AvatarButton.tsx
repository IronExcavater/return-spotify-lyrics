import { CSSProperties, KeyboardEventHandler, ReactNode } from 'react';
import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';

import { useCachedImage } from '../hooks/useCachedImage';

interface AvatarButtonProps extends Omit<IconButtonProps, 'asChild'> {
    avatar: AvatarProps;
    children?: ReactNode;
    hideRing?: boolean;
}

export function AvatarButton({
    avatar,
    children,
    className,
    hideRing = false,
    disabled,
    onKeyDown,
    onKeyUp,
    'aria-pressed': ariaPressed,
    'aria-selected': ariaSelected,
    ...button
}: AvatarButtonProps) {
    const isEnabled = !disabled;
    const {
        className: avatarClassName,
        imageClassName,
        radius: avatarRadius,
        src,
        ...avatarProps
    } = avatar;
    const cachedSrc = useCachedImage(src);

    const ringRadius =
        avatarRadius === 'full' ? '9999px' : 'calc(0.375rem + 4px)';
    const isActive = !!(ariaPressed || ariaSelected);

    const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.click();
        }

        if (event.key === ' ') {
            event.preventDefault();
        }
    };

    const handleKeyUp: KeyboardEventHandler<HTMLButtonElement> = (event) => {
        onKeyUp?.(event);
        if (event.defaultPrevented) return;

        if (event.key === ' ') {
            event.preventDefault();
            event.currentTarget.click();
        }
    };

    return (
        <IconButton
            {...button}
            disabled={disabled}
            asChild
            role="button"
            aria-pressed={ariaPressed}
            aria-selected={ariaSelected}
            tabIndex={disabled ? -1 : 0}
            className={className}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
        >
            <Avatar
                {...avatarProps}
                src={cachedSrc}
                radius={avatarRadius}
                className={clsx(
                    'relative inline-flex items-center justify-center overflow-visible outline-none',
                    !hideRing &&
                        'after:pointer-events-none after:absolute after:inset-[-4px] after:rounded-[var(--avatar-ring-radius)] after:border-2 after:border-transparent after:opacity-0 after:transition-opacity',
                    !hideRing &&
                        isEnabled &&
                        'hover:after:border-[var(--accent-8)] hover:after:opacity-100 focus-visible:after:border-[var(--accent-8)] focus-visible:after:opacity-100',
                    !hideRing &&
                        isActive &&
                        'after:!border-[var(--accent-10)] after:opacity-100',
                    avatarClassName
                )}
                style={
                    {
                        '--avatar-ring-radius': ringRadius,
                    } as CSSProperties
                }
                imageClassName={clsx('block transition-shadow', imageClassName)}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
