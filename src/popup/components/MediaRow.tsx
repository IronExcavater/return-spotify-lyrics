import { ReactNode } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
    Text,
} from '@radix-ui/themes';
import clsx from 'clsx';

import { AvatarButton } from './AvatarButton';
import { Fade } from './Fade';
import { Marquee } from './Marquee';

export interface MediaRowProps {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    icon?: ReactNode;
    imageShape?: 'round' | 'square';
    onClick?: () => void;
    loading?: boolean;
    contextMenu?: ReactNode;
    className?: string;
}

export function MediaRow({
    title,
    subtitle,
    imageUrl,
    icon,
    imageShape = 'square',
    onClick,
    loading = false,
    contextMenu,
    className,
}: MediaRowProps) {
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            align="center"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('w-full min-w-[220px]', className)}
        >
            <Skeleton loading={loading}>
                <AvatarButton
                    avatar={{
                        src: imageUrl,
                        fallback: icon,
                        radius,
                        size: '3',
                    }}
                    aria-label={title}
                />
            </Skeleton>
            <Flex direction="column" gap="0" flexGrow="1" className="min-w-0">
                <Fade enabled={!loading}>
                    <Skeleton
                        loading={loading}
                        className={clsx(loading && 'w-[85%]')}
                    >
                        <Marquee mode="bounce" className="w-full min-w-0">
                            <Text size="2" weight="medium">
                                {title}
                            </Text>
                        </Marquee>
                    </Skeleton>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading}>
                        <Skeleton
                            loading={loading}
                            className={clsx(loading && 'w-[55%]')}
                        >
                            <Marquee mode="left" className="w-full min-w-0">
                                <Text size="1" color="gray">
                                    {subtitle}
                                </Text>
                            </Marquee>
                        </Skeleton>
                    </Fade>
                )}
            </Flex>
            {contextMenu && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger disabled={loading}>
                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <DotsHorizontalIcon />
                        </IconButton>
                    </DropdownMenu.Trigger>
                    {contextMenu}
                </DropdownMenu.Root>
            )}
        </Flex>
    );
}
