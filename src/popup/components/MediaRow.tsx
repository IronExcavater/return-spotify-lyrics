import type { CSSProperties, ReactNode } from 'react';
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

export interface MediaRowProps {
    title?: string;
    subtitle?: string;
    subtitleHeight?: number;
    imageUrl?: string;
    icon?: ReactNode;
    imageShape?: 'round' | 'square';
    showImage?: boolean;
    onClick?: () => void;
    loading?: boolean;
    contextMenu?: ReactNode;
    className?: string;
    style?: CSSProperties;
    seed?: number;
}

export function MediaRow({
    title,
    subtitle,
    subtitleHeight,
    imageUrl,
    icon,
    imageShape = 'square',
    showImage = true,
    onClick,
    loading = false,
    contextMenu,
    className,
    style,
    seed = 0,
}: MediaRowProps) {
    const radius = imageShape === 'round' ? 'full' : 'small';
    const baseSeed =
        hashSequence([title, subtitle, imageUrl], [11, 7, 31], [5]) ^ seed;
    const { titleWidth, subtitleWidth } = seededWidths(baseSeed, {
        titleMin: 68,
        titleRange: 26,
        subtitleMin: 26,
        subtitleRange: 30,
        titleOffset: 5,
        subtitleOffset: 41,
    });
    const titleSkeletonStyle = loading ? { width: `${titleWidth}%` } : {};
    const subtitleSkeletonStyle = loading ? { width: `${subtitleWidth}%` } : {};

    return (
        <Flex
            align="center"
            gap="1"
            onClick={loading ? undefined : onClick}
            className={clsx('group w-full', className)}
            style={style}
        >
            {showImage && (
                <Skeleton loading={loading}>
                    <AvatarButton
                        avatar={{
                            src: imageUrl,
                            fallback: icon,
                            radius,
                            size: '3',
                        }}
                        aria-label={title}
                        hideRing
                    />
                </Skeleton>
            )}
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
                            style={
                                subtitleHeight
                                    ? {
                                          ...subtitleSkeletonStyle,
                                          height: subtitleHeight,
                                      }
                                    : subtitleSkeletonStyle
                            }
                        >
                            <Skeleton loading={loading} className="w-full">
                                <Marquee
                                    mode="left"
                                    className={clsx(
                                        'min-w-0',
                                        !loading && 'w-full'
                                    )}
                                >
                                    <Text
                                        size="1"
                                        color="gray"
                                        style={
                                            subtitleHeight
                                                ? {
                                                      lineHeight: `${subtitleHeight}px`,
                                                      height: subtitleHeight,
                                                  }
                                                : undefined
                                        }
                                    >
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
                            color="gray"
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
