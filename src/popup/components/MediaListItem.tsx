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
}

export function MediaListItem({
    title,
    subtitle,
    imageUrl,
    icon,
    imageShape = 'square',
    onClick,
    loading = false,
    contextMenu,
}: Props) {
    const clickable = Boolean(onClick) && !loading;
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            align="center"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx(clickable && 'cursor-pointer')}
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
            <Flex direction="column" gap="0" className="flex-1">
                <Skeleton
                    loading={loading}
                    className={clsx(loading && 'w-[85%]')}
                >
                    <Fade>
                        <Marquee mode="bounce">
                            <Text size="2" weight="medium">
                                {title}
                            </Text>
                        </Marquee>
                    </Fade>
                </Skeleton>
                {subtitle && (
                    <Skeleton
                        loading={loading}
                        className={clsx(loading && 'w-[55%]')}
                    >
                        <Fade>
                            <Marquee mode="left">
                                <Text size="1" color="gray">
                                    {subtitle}
                                </Text>
                            </Marquee>
                        </Fade>
                    </Skeleton>
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
