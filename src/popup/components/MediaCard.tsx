import { ReactNode } from 'react';
import { Flex, Skeleton, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { AvatarButton } from './AvatarButton';
import { Marquee } from './Marquee';

interface MediaCardProps {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    icon?: ReactNode;
    imageShape?: 'round' | 'square';
    onClick?: () => void;
    loading?: boolean;
    contextMenu?: ReactNode;
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
}: MediaCardProps) {
    const clickable = Boolean(onClick) && !loading;
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            direction="column"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('w-[80px]', clickable && 'cursor-pointer')}
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
                >
                    overlay here!
                </AvatarButton>
            </Skeleton>
            <Flex direction="column">
                <Skeleton
                    loading={loading}
                    className={clsx(loading && 'w-[85%]')}
                >
                    <Marquee mode="bounce">
                        <Text size="1" weight="medium">
                            {title}
                        </Text>
                    </Marquee>
                </Skeleton>
                {subtitle && (
                    <Skeleton
                        loading={loading}
                        className={clsx(loading && 'w-[60%]')}
                    >
                        <Marquee mode="left">
                            <Text size="1" color="gray">
                                {subtitle}
                            </Text>
                        </Marquee>
                    </Skeleton>
                )}
            </Flex>
        </Flex>
    );
}
