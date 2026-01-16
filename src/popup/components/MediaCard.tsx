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
    cardSize?: 1 | 2 | 3;
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
    width,
    seed = 0,
    cardSize = 2,
}: Props) {
    const radius = imageShape === 'round' ? 'full' : 'small';
    const sizeConfig: Record<
        1 | 2 | 3,
        { avatar: '5' | '6' | '7'; width: number }
    > = {
        1: { avatar: '5', width: 72 },
        2: { avatar: '6', width: 88 },
        3: { avatar: '7', width: 104 },
    };
    const resolvedSize = sizeConfig[cardSize] ?? sizeConfig[2];
    const resolvedWidth = width ?? resolvedSize.width;
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
            className={clsx('group', className)}
            style={{ width: resolvedWidth }}
        >
            <Skeleton loading={loading}>
                <AvatarButton
                    avatar={{
                        src: imageUrl,
                        fallback: icon,
                        radius,
                        size: resolvedSize.avatar,
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
                                        'pointer-events-none !ml-auto !self-start !bg-[var(--color-panel-solid)]/10 !opacity-0 !backdrop-blur-[2px] transition-opacity group-hover:pointer-events-auto group-hover:!opacity-100 hover:!bg-[var(--accent-11)]/10 hover:!backdrop-blur-xs data-[state=open]:pointer-events-auto data-[state=open]:!opacity-100'
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
