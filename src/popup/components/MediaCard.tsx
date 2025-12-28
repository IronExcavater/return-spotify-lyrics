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
}

export function MediaCard({
    title,
    subtitle,
    imageUrl,
    icon,
    imageShape = 'square',
    onClick,
    loading = false,
}: MediaCardProps) {
    const clickable = Boolean(onClick) && !loading;
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            direction="column"
            p="2"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('shrink-0', clickable && 'cursor-pointer')}
        >
            <Skeleton loading={loading}>
                <AvatarButton
                    avatar={{
                        src: imageUrl,
                        fallback: icon,
                        radius,
                        size: imageShape === 'square' ? '6' : '7',
                    }}
                    aria-label={title}
                />
            </Skeleton>
            <Flex direction="column" gap="0" className="min-w-0">
                <Skeleton loading={loading}>
                    <Marquee mode="bounce" className="w-full min-w-0">
                        <Text size="1" weight="medium" className="leading-none">
                            {title}
                        </Text>
                    </Marquee>
                </Skeleton>
                {subtitle && (
                    <Skeleton loading={loading}>
                        <Marquee mode="right" className="w-full min-w-0">
                            <Text
                                size="1"
                                color="gray"
                                className="leading-none"
                            >
                                {subtitle}
                            </Text>
                        </Marquee>
                    </Skeleton>
                )}
            </Flex>
        </Flex>
    );
}
