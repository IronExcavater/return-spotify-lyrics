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
    overlayPointerEvents?: 'auto' | 'none';
}

export function AvatarButton({
    avatar,
    children,
    className,
    hideRing = false,
    overlayPointerEvents = 'auto',
    disabled,
    tabIndex,
    onKeyDown,
    onKeyUp,
    'aria-pressed': ariaPressed,
    'aria-selected': ariaSelected,
    ...button
}: AvatarButtonProps) {
    const isEnabled = !disabled;
    const {
        className: avatarClassName,
        radius: avatarRadius,
        src,
        ...avatarProps
    } = avatar;
    const cachedSrc = useCachedImage(src);

    const ringRadius =
        avatarRadius === 'full' ? '9999px' : 'calc(0.375rem + 4px)';
    const isActive = !!(ariaPressed || ariaSelected);
    const resolvedTabIndex = disabled ? -1 : (tabIndex ?? 0);
    const overlayClassName =
        overlayPointerEvents === 'none'
            ? '[&_.rt-AvatarOverlay]:pointer-events-none'
            : undefined;

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
            tabIndex={resolvedTabIndex}
            className={className}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
        >
            <Avatar
                {...avatarProps}
                src={cachedSrc}
                radius={avatarRadius}
                className={clsx(
                    !hideRing &&
                        'after:pointer-events-none after:absolute after:-inset-1 after:rounded-(--avatar-ring-radius) after:border-2 after:border-transparent after:opacity-0 after:transition-opacity',
                    !hideRing &&
                        isEnabled &&
                        'focus-within:after:border-accent-8 hover:after:border-accent-8 focus-visible:after:border-accent-8 focus-within:after:opacity-100 hover:after:opacity-100 focus-visible:after:opacity-100',
                    !hideRing &&
                        isActive &&
                        'after:border-accent-10! after:opacity-100',
                    overlayClassName,
                    avatarClassName
                )}
                style={
                    {
                        '--avatar-ring-radius': ringRadius,
                    } as CSSProperties
                }
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
