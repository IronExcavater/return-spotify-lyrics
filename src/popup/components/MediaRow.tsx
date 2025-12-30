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
    const hash = (value: string | undefined, salt: number) => {
        if (!value) return salt * 5;
        let h = salt;
        for (let i = 0; i < value.length; i += 1) {
            h = (h << 5) - h + value.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    };
    const titleSeed = hash(title, 11) + hash(subtitle, 7);
    const subtitleSeed = hash(subtitle, 19) + hash(title, 3);
    const titleWidth = 65 + (titleSeed % 28); // 65–92%
    const subtitleWidth = 40 + (subtitleSeed % 32); // 40–71%
    const titleSkeletonStyle = loading ? { width: `${titleWidth}%` } : {};
    const subtitleSkeletonStyle = loading ? { width: `${subtitleWidth}%` } : {};

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
                    <div
                        className="transition-all duration-300 ease-out"
                        style={titleSkeletonStyle}
                    >
                        <Skeleton loading={loading} className="w-full">
                            <Marquee
                                mode="bounce"
                                className={clsx(
                                    'min-w-0',
                                    !loading && 'w-full'
                                )}
                            >
                                <Text size="2" weight="medium">
                                    {title}
                                </Text>
                            </Marquee>
                        </Skeleton>
                    </div>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading}>
                        <div
                            className="transition-all duration-300 ease-out"
                            style={subtitleSkeletonStyle}
                        >
                            <Skeleton loading={loading} className="w-full">
                                <Marquee
                                    mode="left"
                                    className={clsx(
                                        'min-w-0',
                                        !loading && 'w-full'
                                    )}
                                >
                                    <Text size="1" color="gray">
                                        {subtitle}
                                    </Text>
                                </Marquee>
                            </Skeleton>
                        </div>
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
