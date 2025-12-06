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

    return (
        <IconButton
            {...button}
            disabled={disabled}
            asChild
            className={clsx(isEnabled && 'cursor-pointer', className)}
        >
            <Avatar {...avatar} className={clsx('block', avatar.className)}>
                {children}
            </Avatar>
        </IconButton>
    );
}
