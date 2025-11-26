import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface Props {
    children?: ReactNode;

    avatarProps?: AvatarProps;
    buttonProps?: IconButtonProps;
}

export function AvatarButton({
    children,
    avatarProps = {},
    buttonProps = {},
}: Props) {
    const isEnabled = !buttonProps.disabled;

    return (
        <IconButton
            {...buttonProps}
            asChild
            className={clsx(
                isEnabled && 'cursor-pointer',
                buttonProps.className
            )}
        >
            <Avatar {...avatarProps} className={avatarProps.className}>
                {children}
            </Avatar>
        </IconButton>
    );
}
