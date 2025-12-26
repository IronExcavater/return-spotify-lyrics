import { ReactNode } from 'react';
import { Flex, Skeleton, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { AvatarButton } from './AvatarButton';
import { Marquee } from './Marquee';

interface Props {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    icon?: ReactNode;
    onClick?: () => void;
    loading?: boolean;
}

export function MediaCard({
    title,
    subtitle,
    imageUrl,
    icon,
    onClick,
    loading = false,
}: Props) {
    const clickable = Boolean(onClick) && !loading;

    return (
        <Flex
            direction="column"
            p="2"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx(
                'w-24 min-w-24 shrink-0',
                clickable && 'cursor-pointer'
            )}
        >
            {loading ? (
                <Skeleton>
                    <div className="h-20 w-20 rounded-md" />
                </Skeleton>
            ) : (
                <AvatarButton
                    avatar={{
                        src: imageUrl,
                        fallback: icon,
                        radius: 'small',
                        size: '6',
                    }}
                    aria-label={title}
                />
            )}
            <Flex direction="column" gap="0" className="min-w-0">
                {loading ? (
                    <>
                        <Skeleton>
                            <div className="h-2 w-full rounded-md" />
                        </Skeleton>
                        <Skeleton>
                            <div className="h-2 w-4/5 rounded-md" />
                        </Skeleton>
                    </>
                ) : (
                    <>
                        <Marquee mode="bounce" className="w-full min-w-0">
                            <Text
                                size="1"
                                weight="medium"
                                className="leading-none"
                            >
                                {title}
                            </Text>
                        </Marquee>
                        {subtitle && (
                            <Marquee mode="right" className="w-full min-w-0">
                                <Text
                                    size="1"
                                    color="gray"
                                    className="leading-none"
                                >
                                    {subtitle}
                                </Text>
                            </Marquee>
                        )}
                    </>
                )}
            </Flex>
        </Flex>
    );
}
