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
import { hashSequence, seededWidths } from '../../shared/math';
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
    const subtitleContent = subtitle?.trim() ? subtitle : ' ';
    const baseSeed =
        hashSequence([title, subtitle, imageUrl], [13, 17, 23], [7]) ^ seed;
    const { titleWidth, subtitleWidth } = seededWidths(baseSeed, {
        titleMin: 68,
        titleRange: 28,
        subtitleMin: 28,
        subtitleRange: 32,
        titleOffset: 11,
        subtitleOffset: 29,
    });
    const titleSkeletonStyle = loading ? { width: `${titleWidth}%` } : {};
    const subtitleSkeletonStyle = loading ? { width: `${subtitleWidth}%` } : {};

    return (
        <Flex
            direction="column"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('marquee-hover-group w-20', className)}
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
                    hideRing
                    className="relative"
                >
                    {contextMenu && (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <IconButton
                                    variant="ghost"
                                    radius="full"
                                    size="0"
                                    color="gray"
                                    onClick={(event) => event.stopPropagation()}
                                    className={clsx(
                                        imageShape === 'round'
                                            ? '!m-2'
                                            : '!m-1',
                                        '!ml-auto !self-start !bg-[var(--color-panel-solid)]/10 !backdrop-blur-[2px] hover:!bg-[var(--accent-11)]/10 hover:!backdrop-blur-xs' // !bg-[var(--color-panel-solid)]/40 text-[var(--accent-9)] shadow-sm backdrop-blur-xs transition-[background-color,opacity] opacity-40 hover:!bg-[var(--color-panel-solid)]/80 hover:opacity-100'
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
                <Fade enabled={!loading}>
                    <div
                        className="min-h-[14px] transition-all duration-300 ease-out"
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
                                    {subtitleContent}
                                </Text>
                            </Marquee>
                        </Skeleton>
                    </div>
                </Fade>
            </Flex>
        </Flex>
    );
}
