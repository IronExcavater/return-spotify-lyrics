import { ReactNode, useCallback, useState } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { DropdownMenu, Flex, IconButton, Skeleton } from '@radix-ui/themes';
import clsx from 'clsx';

import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { AvatarButton } from './AvatarButton';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { SkeletonText } from './SkeletonText';
import { TextButton } from './TextButton';

interface Props {
    title?: string;
    subtitle?: ReactNode;
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
        1: { avatar: '5', width: 64 },
        2: { avatar: '6', width: 80 },
        3: { avatar: '7', width: 96 },
    };
    const resolvedSize = sizeConfig[cardSize] ?? sizeConfig[2];
    const resolvedWidth = width ?? resolvedSize.width;
    const subtitleText = typeof subtitle === 'string' ? subtitle : undefined;
    const subtitleContent = subtitleText?.trim() ? subtitleText : ' ';
    const skeletonParts = [title, subtitleText, imageUrl];
    const handleRowClick = loading ? undefined : onClick;
    const [isTitleProxyHovered, setIsTitleProxyHovered] = useState(false);

    const updateTitleProxyHover = useCallback(
        (target: EventTarget | null) => {
            const element = target instanceof Element ? target : null;
            const next =
                Boolean(handleRowClick) &&
                !element?.closest('[data-title-hover-stop="true"]');
            setIsTitleProxyHovered((prev) => (prev === next ? prev : next));
        },
        [handleRowClick]
    );

    return (
        <Flex
            direction="column"
            gap="1"
            onClick={handleRowClick}
            onPointerEnter={(event) => updateTitleProxyHover(event.target)}
            onPointerMove={(event) => updateTitleProxyHover(event.target)}
            onPointerLeave={() => setIsTitleProxyHovered(false)}
            className={clsx(
                'group',
                handleRowClick && 'cursor-pointer',
                className
            )}
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
                    tabIndex={-1}
                >
                    {contextMenu && (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger
                                onKeyDown={handleMenuTriggerKeyDown}
                            >
                                <IconButton
                                    data-title-hover-stop="true"
                                    variant="ghost"
                                    radius="full"
                                    size="0"
                                    color="gray"
                                    onClick={(event) => event.stopPropagation()}
                                    onPointerDown={(event) =>
                                        event.stopPropagation()
                                    }
                                    className={clsx(
                                        imageShape === 'round'
                                            ? 'm-2!'
                                            : 'm-1!',
                                        'bg-panel-solid/10! pointer-events-none ml-auto! self-start! opacity-0! backdrop-blur-[2px]! transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100! group-hover:pointer-events-auto group-hover:opacity-100! group-focus-visible:pointer-events-auto group-focus-visible:opacity-100! hover:bg-(--accent-11)/10! hover:backdrop-blur-xs! data-[state=open]:pointer-events-auto data-[state=open]:opacity-100!'
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
            <Flex direction="column" className="w-full min-w-0">
                <Fade enabled={!loading} grow>
                    <SkeletonText
                        loading={loading}
                        parts={skeletonParts}
                        seed={seed}
                        preset="media-card"
                        className="transition-all"
                    >
                        <Marquee mode="bounce" grow>
                            <TextButton
                                size="1"
                                weight="medium"
                                interactive={Boolean(handleRowClick)}
                                forceHover={isTitleProxyHovered}
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
                <Fade enabled={!loading} grow>
                    <SkeletonText
                        loading={loading}
                        parts={skeletonParts}
                        seed={seed}
                        preset="media-card"
                        variant="subtitle"
                        className="min-h-3.5 transition-all"
                    >
                        <Marquee mode="left" grow>
                            {subtitleText != null ? (
                                <TextButton
                                    size="1"
                                    color="gray"
                                    interactive={false}
                                >
                                    {subtitleContent}
                                </TextButton>
                            ) : (
                                <span
                                    data-title-hover-stop="true"
                                    className="inline-flex items-center"
                                >
                                    {subtitle}
                                </span>
                            )}
                        </Marquee>
                    </SkeletonText>
                </Fade>
            </Flex>
        </Flex>
    );
}
