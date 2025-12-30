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
    seed?: number;
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
    seed = 0,
}: Props) {
    const radius = imageShape === 'round' ? 'full' : 'small';
    const hash = (value: string | undefined, salt: number) => {
        if (!value) return salt * 7;
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
        hash(title, 13) ^ hash(subtitle, 17) ^ hash(imageUrl, 23) ^ seed;
    const titleWidth = Math.round(68 + noise(baseSeed + 11) * 28); // 68–96%
    const subtitleWidth = Math.round(28 + noise(baseSeed + 29) * 32); // 28–60%
    const titleSkeletonStyle = loading ? { width: `${titleWidth}%` } : {};
    const subtitleSkeletonStyle = loading ? { width: `${subtitleWidth}%` } : {};

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
                                <Text size="1" weight="medium">
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
        </Flex>
    );
}
