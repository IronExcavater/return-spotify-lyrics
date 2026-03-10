import { CSSProperties, KeyboardEventHandler, ReactNode } from 'react';
import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';

import { useCachedImage } from '../hooks/useMediaCache';

interface AvatarButtonProps extends Omit<IconButtonProps, 'asChild'> {
    avatar: AvatarProps;
    children?: ReactNode;
    hideRing?: boolean;
    overlayPointerEvents?: 'auto' | 'none';
}

const AVATAR_RADIUS_BY_SIZE: Record<string, string> = {
    '1': 'var(--radius-2)',
    '2': 'var(--radius-2)',
    '3': 'var(--radius-3)',
    '4': 'var(--radius-3)',
    '5': 'var(--radius-4)',
    '6': 'var(--radius-5)',
    '7': 'var(--radius-5)',
    '8': 'var(--radius-6)',
    '9': 'var(--radius-6)',
};

const resolveAvatarBaseRadius = (size?: AvatarProps['size']) => {
    const normalizedSize = typeof size === 'string' ? size : '3';
    const radiusBySize =
        AVATAR_RADIUS_BY_SIZE[normalizedSize] ?? 'var(--radius-3)';
    return `max(${radiusBySize}, var(--radius-full))`;
};

const resolveAvatarRingRadius = (
    size?: AvatarProps['size'],
    radius?: AvatarProps['radius']
) => {
    if (radius === 'full') return '9999px';
    return `calc(${resolveAvatarBaseRadius(size)} + 4px)`;
};

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
        imageClassName,
        radius: avatarRadius,
        src,
        style: avatarStyle,
        ...avatarProps
    } = avatar;
    const cachedSrc = useCachedImage(src);

    const isActive = !!(ariaPressed || ariaSelected);
    const resolvedTabIndex = disabled ? -1 : (tabIndex ?? 0);
    const overlayClassName =
        overlayPointerEvents === 'none'
            ? '[&_.rt-AvatarOverlay]:pointer-events-none'
            : undefined;
    const ringColor = isActive ? 'var(--accent-10)' : 'var(--accent-8)';
    const ringRadius = resolveAvatarRingRadius(avatarProps.size, avatarRadius);
    const mergedAvatarStyle = hideRing
        ? avatarStyle
        : ({
              ...(avatarStyle ?? {}),
              '--avatar-ring-color': ringColor,
              '--avatar-ring-radius': ringRadius,
          } as CSSProperties);

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
                        'focus-within:after:border-(--avatar-ring-color) focus-within:after:opacity-100 hover:after:border-(--avatar-ring-color) hover:after:opacity-100 focus-visible:after:border-(--avatar-ring-color) focus-visible:after:opacity-100',
                    !hideRing &&
                        isActive &&
                        'after:border-(--avatar-ring-color)! after:opacity-100',
                    overlayClassName,
                    avatarClassName
                )}
                style={mergedAvatarStyle}
                imageClassName={clsx(
                    'focus-visible:outline-none',
                    imageClassName
                )}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
