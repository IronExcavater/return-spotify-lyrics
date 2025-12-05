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
            <div className="relative inline-flex items-center justify-center">
                <Avatar
                    {...avatar}
                    className={clsx(
                        'pointer-events-none block',
                        avatar.className
                    )}
                />
                {children && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {children}
                    </div>
                )}
            </div>
        </IconButton>
    );
}
