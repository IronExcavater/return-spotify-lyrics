import type { CSSProperties, ReactNode } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { DropdownMenu, Flex, IconButton, Skeleton } from '@radix-ui/themes';
import clsx from 'clsx';

import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { AvatarButton } from './AvatarButton';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { SkeletonText } from './SkeletonText';
import { TextButton } from './TextButton';

export interface MediaRowProps {
    title?: string;
    subtitle?: ReactNode;
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
    const subtitleText = typeof subtitle === 'string' ? subtitle : undefined;
    const skeletonParts = [title, subtitleText, imageUrl];
    const handleRowClick = loading ? undefined : onClick;

    return (
        <Flex
            align="center"
            gap="1"
            onClick={handleRowClick}
            className={clsx(
                'group w-full min-w-0',
                handleRowClick && 'cursor-pointer',
                className
            )}
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
                        tabIndex={-1}
                    />
                </Skeleton>
            )}
            <Flex direction="column" flexGrow="1" className="min-w-0">
                <Fade enabled={!loading} grow>
                    <SkeletonText
                        loading={loading}
                        parts={skeletonParts}
                        seed={seed}
                        preset="media-row"
                    >
                        <Marquee mode="bounce" grow>
                            <TextButton
                                size="2"
                                weight="medium"
                                interactive={Boolean(handleRowClick)}
                                onClick={
                                    handleRowClick
                                        ? (event) => {
                                              event.stopPropagation();
                                              handleRowClick();
                                          }
                                        : undefined
                                }
                            >
                                {title}
                            </TextButton>
                        </Marquee>
                    </SkeletonText>
                </Fade>
                {subtitle && (
                    <Fade enabled={!loading} grow>
                        <SkeletonText
                            loading={loading}
                            parts={skeletonParts}
                            seed={seed}
                            preset="media-row"
                            variant="subtitle"
                            style={
                                subtitleHeight
                                    ? {
                                          lineHeight: `${subtitleHeight}px`,
                                          height: subtitleHeight,
                                      }
                                    : undefined
                            }
                        >
                            <Marquee mode="left" grow>
                                {subtitleText != null ? (
                                    <TextButton
                                        size="1"
                                        color="gray"
                                        interactive={false}
                                    >
                                        {subtitleText}
                                    </TextButton>
                                ) : (
                                    <span className="inline-flex items-center">
                                        {subtitle}
                                    </span>
                                )}
                            </Marquee>
                        </SkeletonText>
                    </Fade>
                )}
            </Flex>
            {contextMenu && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={loading}
                        onKeyDown={handleMenuTriggerKeyDown}
                    >
                        <IconButton
                            variant="ghost"
                            radius="full"
                            size="1"
                            color="gray"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
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
