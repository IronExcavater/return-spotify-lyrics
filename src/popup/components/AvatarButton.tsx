import { KeyboardEventHandler, ReactNode } from 'react';
import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';

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
        ...avatarProps
    } = avatar;

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
                className={clsx(
                    'relative inline-flex items-center justify-center overflow-visible',
                    avatarClassName
                )}
                imageClassName={clsx(
                    'block transition-shadow',
                    hideRing
                        ? 'ring-0 ring-offset-0 focus-visible:outline-none'
                        : 'ring-2 ring-transparent ring-offset-2 ring-offset-[var(--color-background)] focus-visible:outline-none',
                    !hideRing &&
                        isEnabled &&
                        'focus-visible:ring-2 focus-visible:ring-[var(--accent-8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]',
                    !hideRing &&
                        isEnabled &&
                        'hover:ring-2 hover:ring-[var(--accent-8)] hover:ring-offset-2 hover:ring-offset-[var(--color-background)]',
                    !hideRing &&
                        isEnabled &&
                        (ariaPressed || ariaSelected) &&
                        '!ring-[var(--accent-10)] ring-offset-2 ring-offset-[var(--color-background)]',
                    imageClassName
                )}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
