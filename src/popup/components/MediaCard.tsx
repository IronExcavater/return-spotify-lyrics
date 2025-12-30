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

interface Props {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    icon?: ReactNode;
    imageShape?: 'round' | 'square';
    onClick?: () => void;
    loading?: boolean;
    contextMenu?: ReactNode;
    className?: string;
    width?: number | string;
}

export function MediaCard({
    title,
    subtitle,
    imageUrl,
    icon,
    imageShape = 'square',
    onClick,
    loading = false,
    contextMenu,
    className,
}: Props) {
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            direction="column"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('w-20', className)}
        >
            <Skeleton loading={loading}>
                <AvatarButton
                    avatar={{
                        src: imageUrl,
                        fallback: icon,
                        radius,
                        size: '6',
                    }}
                    aria-label={title}
                    className="relative"
                >
                    {contextMenu && (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="1"
                                    onClick={(event) => event.stopPropagation()}
                                    className={clsx(
                                        imageShape === 'round'
                                            ? '!m-2'
                                            : '!m-1',
                                        '!ml-auto !self-start'
                                    )}
                                >
                                    <DotsHorizontalIcon />
                                </IconButton>
                            </DropdownMenu.Trigger>
                            {contextMenu}
                        </DropdownMenu.Root>
                    )}
                </AvatarButton>
            </Skeleton>
            <Flex direction="column" className="min-w-0">
                <Fade enabled={!loading}>
                    <Skeleton
                        loading={loading}
                        className={clsx(loading && 'w-[85%]')}
                    >
                        <Marquee mode="bounce" className="w-full min-w-0">
                            <Text size="1" weight="medium">
                                {title}
                            </Text>
                        </Marquee>
                    </Skeleton>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading}>
                        <Skeleton
                            loading={loading}
                            className={clsx(loading && 'w-[60%]')}
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
        </Flex>
    );
}
