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
    endAdornment?: ReactNode;
}

export function MediaListItem({
    title,
    subtitle,
    imageUrl,
    icon,
    imageShape = 'square',
    onClick,
    loading = false,
    endAdornment,
}: MediaListItemProps) {
    const clickable = Boolean(onClick) && !loading;
    const radius = imageShape === 'round' ? 'full' : 'small';

    return (
        <Flex
            align="center"
            gap="2"
            p="2"
            onClick={loading ? undefined : onClick}
            className={clsx('min-w-0', clickable && 'cursor-pointer')}
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
            <Flex direction="column" gap="0" className="min-w-0 flex-1">
                <Skeleton loading={loading}>
                    <Marquee mode="bounce" className="w-full min-w-0">
                        <Text size="2" weight="medium" className="leading-none">
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
            {!loading && endAdornment && <div>{endAdornment}</div>}
        </Flex>
    );
}
