import { ReactNode } from 'react';
import { Flex, Skeleton, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { AvatarButton } from './AvatarButton';
import { Marquee } from './Marquee';

interface MediaListItemProps {
    title: string;
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
}: MediaListItemProps) {
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
                    <Marquee mode="bounce">
                        <Text size="2" weight="medium">
                            {title}
                        </Text>
                    </Marquee>
                </Skeleton>
                {subtitle && (
                    <Skeleton
                        loading={loading}
                        className={clsx(loading && 'w-[55%]')}
                    >
                        <Marquee mode="left">
                            <Text size="1" color="gray">
                                {subtitle}
                            </Text>
                        </Marquee>
                    </Skeleton>
                )}
            </Flex>
            {!loading && contextMenu && (
                <div
                    className="ml-auto"
                    onClick={(event) => event.stopPropagation()}
                >
                    {contextMenu}
                </div>
            )}
        </Flex>
    );
}
