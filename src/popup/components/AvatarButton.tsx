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
}

export function AvatarButton({
    avatar,
    children,
    className,
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
                className={clsx(avatarClassName)}
                imageClassName={clsx(
                    'block ring-2 ring-transparent ring-offset-[var(--color-panel-solid)] transition-shadow',
                    'focus-visible:outline-none',
                    isEnabled &&
                        'focus-visible:ring-2 focus-visible:ring-[var(--accent-8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-panel-solid)]',
                    isEnabled &&
                        'hover:ring-2 hover:ring-[var(--accent-8)] hover:ring-offset-2 hover:ring-offset-[var(--color-panel-solid)]',
                    isEnabled &&
                        (ariaPressed || ariaSelected) &&
                        '!ring-[var(--accent-10)] ring-offset-2',
                    imageClassName
                )}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
