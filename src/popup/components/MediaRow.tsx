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
    seed?: number;
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
    seed = 0,
}: MediaRowProps) {
    const radius = imageShape === 'round' ? 'full' : 'small';
    const hash = (value: string | undefined, salt: number) => {
        if (!value) return salt * 5;
        let h = salt | 0;
        for (let i = 0; i < value.length; i += 1) {
            h ^= value.charCodeAt(i) + 0x9e3779b9 + (h << 6) + (h >> 2);
        }
        h ^= h << 13;
        h ^= h >> 17;
        h ^= h << 5;
        return h >>> 0;
    };
    const noise = (seed: number) => {
        let t = seed + 0x6d2b79f5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const baseSeed =
        hash(title, 11) ^ hash(subtitle, 7) ^ hash(imageUrl, 31) ^ seed;
    const titleWidth = Math.round(68 + noise(baseSeed + 5) * 26); // 68–94%
    const subtitleWidth = Math.round(26 + noise(baseSeed + 41) * 30); // 26–56%
    const titleSkeletonStyle = loading ? { width: `${titleWidth}%` } : {};
    const subtitleSkeletonStyle = loading ? { width: `${subtitleWidth}%` } : {};

    return (
        <Flex
            align="center"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('w-full', className)}
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
