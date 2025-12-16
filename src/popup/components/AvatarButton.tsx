import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface AvatarButtonProps extends Omit<IconButtonProps, 'asChild'> {
    avatar: AvatarProps;
    children?: ReactNode;
}

export function AvatarButton({
    avatar,
    children,
    className,
    disabled,
    ...button
}: AvatarButtonProps) {
    const isEnabled = !disabled;
    const {
        className: avatarClassName,
        imageClassName,
        ...avatarProps
    } = avatar;

    return (
        <IconButton
            {...button}
            disabled={disabled}
            asChild
            role="button"
            tabIndex={0}
            className={clsx(isEnabled && 'cursor-pointer', className)}
        >
            <Avatar
                {...avatarProps}
                className={clsx(avatarClassName)}
                imageClassName={clsx(
                    'block ring-2 ring-transparent ring-offset-[var(--color-panel-solid)] transition-shadow',
                    'focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-[var(--accent-10)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-panel-solid)]',
                    imageClassName
                )}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
