import { useState, type CSSProperties, type ReactNode } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
    Checkbox,
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
} from '@radix-ui/themes';
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
    contextMenuDisabled?: boolean;
    className?: string;
    style?: CSSProperties;
    seed?: number;
    showPosition?: boolean;
    position?: number;
    selection?: {
        checked: boolean;
        onCheckedChange: (checked: boolean) => void;
    };
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
    contextMenuDisabled = false,
    className,
    style,
    seed = 0,
    showPosition = false,
    position,
    selection,
}: MediaRowProps) {
    const radius = imageShape === 'round' ? 'full' : 'small';
    const subtitleText = typeof subtitle === 'string' ? subtitle : undefined;
    const skeletonParts = [title, subtitleText, imageUrl];
    const handleRowClick = loading ? undefined : onClick;
    const [isRowHovered, setIsRowHovered] = useState(false);
    const showSelection = Boolean(
        selection && (selection.checked || isRowHovered)
    );
    const positionLabel = Number.isFinite(position)
        ? `#${Number(position) + 1}`
        : '#';

    return (
        <Flex
            align="center"
            gap="1"
            onClick={handleRowClick}
            onPointerEnter={() => setIsRowHovered(true)}
            onPointerLeave={() => setIsRowHovered(false)}
            className={clsx(
                'group rounded-2 bg-background w-full min-w-0',
                handleRowClick && 'cursor-pointer',
                className
            )}
            style={style}
        >
            {(showPosition || selection) && (
                <Flex align="center" justify="center" className="w-11 shrink-0">
                    {selection ? (
                        <Flex
                            direction="column"
                            align="center"
                            justify="center"
                            className="h-8 w-11"
                        >
                            <div
                                className={clsx(
                                    'grid w-7 overflow-hidden transition-[grid-template-rows,opacity]',
                                    showSelection
                                        ? 'grid-rows-[1fr] opacity-100'
                                        : 'grid-rows-[0fr] opacity-0'
                                )}
                            >
                                <div className="overflow-hidden pb-0.5">
                                    <span className="block w-7 pr-0.5 text-center text-[10px] leading-none font-medium text-[--gray-10] tabular-nums">
                                        {positionLabel}
                                    </span>
                                </div>
                            </div>
                            <div
                                className={clsx(
                                    'grid h-4 w-7 place-items-center transition-[transform] duration-200',
                                    showSelection
                                        ? 'translate-y-0'
                                        : '-translate-y-1.5'
                                )}
                            >
                                <span
                                    className={clsx(
                                        'col-start-1 row-start-1 block w-7 pr-0.5 text-center text-[10px] leading-none font-medium text-[--gray-10] tabular-nums transition-[opacity,transform] duration-200',
                                        showSelection
                                            ? 'translate-y-0.5 scale-95 opacity-0'
                                            : 'translate-y-0 scale-100 opacity-100'
                                    )}
                                >
                                    {positionLabel}
                                </span>
                                <div
                                    className={clsx(
                                        'col-start-1 row-start-1 flex h-4 w-4 items-center justify-center transition-[opacity,transform] duration-200',
                                        showSelection
                                            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                                            : 'pointer-events-none translate-y-0.5 scale-90 opacity-0'
                                    )}
                                >
                                    <Checkbox
                                        checked={selection.checked}
                                        color="green"
                                        size="1"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                        onPointerDown={(event) =>
                                            event.stopPropagation()
                                        }
                                        onCheckedChange={(checked) =>
                                            selection.onCheckedChange(
                                                checked === true
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </Flex>
                    ) : (
                        <div
                            className={clsx(
                                'flex h-8 w-11 items-center justify-center'
                            )}
                        >
                            <span className="block w-7 pr-0.5 text-center text-[10px] leading-none font-medium text-[--gray-10] tabular-nums">
                                {positionLabel}
                            </span>
                        </div>
                    )}
                </Flex>
            )}
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
                                forceHover={isRowHovered}
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
                )}
            </Flex>
            {contextMenu && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={loading || contextMenuDisabled}
                        onKeyDown={handleMenuTriggerKeyDown}
                    >
                        <IconButton
                            data-title-hover-stop="true"
                            variant="ghost"
                            radius="full"
                            size="1"
                            color="gray"
                            onClick={
                                contextMenuDisabled
                                    ? undefined
                                    : (event) => event.stopPropagation()
                            }
                            onPointerDown={
                                contextMenuDisabled
                                    ? undefined
                                    : (event) => event.stopPropagation()
                            }
                            className={clsx(
                                contextMenuDisabled && 'pointer-events-none'
                            )}
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
