import {
    Avatar,
    AvatarProps,
    IconButton,
    IconButtonProps,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface AvatarButtonProps {
    avatar: AvatarProps;
    button?: IconButtonProps;
    children?: ReactNode;
}

export function AvatarButton({
    avatar,
    button = {},
    children,
}: AvatarButtonProps) {
    const isEnabled = !button.disabled;

    return (
        <IconButton
            {...button}
            asChild
            className={clsx(isEnabled && 'cursor-pointer', button.className)}
        >
            <Avatar {...avatar} className={avatar.className}>
                {children}
            </Avatar>
        </IconButton>
    );
}
