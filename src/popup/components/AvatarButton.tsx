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
    active?: boolean;
}

export function AvatarButton({
    avatar,
    children,
    className,
    disabled,
    active,
    ...button
}: AvatarButtonProps) {
    const isEnabled = !disabled;

    return (
        <IconButton
            {...button}
            disabled={disabled}
            asChild
            className={clsx(isEnabled && 'cursor-pointer', className)}
        >
            <Avatar
                {...avatar}
                className={clsx(
                    'block',
                    'ring-2 ring-transparent ring-offset-[var(--color-panel-solid)] transition-shadow',
                    isEnabled &&
                        'hover:ring-[var(--accent-9)] hover:ring-offset-2 focus-visible:ring-[var(--accent-10)] focus-visible:ring-offset-2',
                    isEnabled &&
                        active &&
                        '!ring-[var(--accent-10)] ring-offset-2',
                    avatar.className
                )}
                aria-pressed={active}
            >
                {children}
            </Avatar>
        </IconButton>
    );
}
