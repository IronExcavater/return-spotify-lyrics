import {
    useState,
    type CSSProperties,
    type MouseEvent,
    type ReactNode,
} from 'react';
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
import { useInteractiveTargetGuard } from '../hooks/useInteractiveTargetGuard';
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

const POSITION_LABEL_CLASS_NAME =
    'block min-w-[4ch] text-center text-[10px] leading-none font-medium text-[--gray-10] tabular-nums';

type MediaRowSelection = NonNullable<MediaRowProps['selection']>;

function MediaRowPosition({
    label,
    selection,
    showSelection,
}: {
    label: string;
    selection?: MediaRowSelection;
    showSelection: boolean;
}) {
    if (!selection) {
        return (
            <div className="flex h-8 w-9 items-center justify-center">
                <span className={POSITION_LABEL_CLASS_NAME}>{label}</span>
            </div>
        );
    }

    return (
        <div className="flex h-8 w-9 flex-col items-center justify-center overflow-hidden">
            <div
                className={clsx(
                    'flex min-w-[4ch] justify-center transition-transform',
                    showSelection ? '-translate-y-0.5' : 'translate-y-1.5'
                )}
            >
                <span className={POSITION_LABEL_CLASS_NAME}>{label}</span>
            </div>
            <div
                className={clsx(
                    'flex h-4 items-center justify-center transition-[opacity,transform]',
                    showSelection
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-1.5 opacity-0'
                )}
            >
                <Checkbox
                    checked={selection.checked}
                    color="green"
                    size="1"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onCheckedChange={(checked) =>
                        selection.onCheckedChange(checked === true)
                    }
                />
            </div>
        </div>
    );
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
    const resolvedSubtitleStyle =
        subtitleHeight != null
            ? {
                  lineHeight: `${subtitleHeight}px`,
                  height: subtitleHeight,
              }
            : {
                  lineHeight: 'var(--line-height-1)',
                  height: 'var(--line-height-1)',
              };
    const handleRowClick = loading ? undefined : onClick;
    const [isRowHovered, setIsRowHovered] = useState(false);
    const [isTitleProxyHovered, setIsTitleProxyHovered] = useState(false);
    const { isInteractiveTarget } = useInteractiveTargetGuard();
    const showSelection = Boolean(
        selection && (selection.checked || isRowHovered)
    );
    const positionLabel = Number.isFinite(position)
        ? String(Number(position) + 1)
        : '';
    const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!handleRowClick) return;
        if (isInteractiveTarget(event.target)) return;
        handleRowClick();
    };
    const updateTitleProxyHover = (target: EventTarget | null) => {
        const next = Boolean(handleRowClick) && !isInteractiveTarget(target);
        setIsTitleProxyHovered((previous) =>
            previous === next ? previous : next
        );
    };

    return (
        <Flex
            align="center"
            gap="1"
            onClick={handleContainerClick}
            onPointerEnter={(event) => {
                setIsRowHovered(true);
                updateTitleProxyHover(event.target);
            }}
            onPointerMove={(event) => updateTitleProxyHover(event.target)}
            onPointerLeave={() => {
                setIsRowHovered(false);
                setIsTitleProxyHovered(false);
            }}
            className={clsx(
                'group rounded-2 bg-background w-full min-w-0',
                handleRowClick && 'cursor-pointer',
                className
            )}
            style={style}
        >
            {(showPosition || selection) && (
                <Flex align="center" justify="center" className="w-9 shrink-0">
                    <MediaRowPosition
                        label={positionLabel}
                        selection={selection}
                        showSelection={showSelection}
                    />
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
                {loading ? (
                    <>
                        <SkeletonText
                            loading
                            seed={seed}
                            preset="media-row"
                            variant="title"
                            style={{
                                lineHeight: 'var(--line-height-2)',
                                height: 'var(--line-height-2)',
                            }}
                        >
                            <span aria-hidden />
                        </SkeletonText>
                        <SkeletonText
                            loading
                            seed={seed}
                            preset="media-row"
                            variant="subtitle"
                            style={resolvedSubtitleStyle}
                        >
                            <span aria-hidden />
                        </SkeletonText>
                    </>
                ) : (
                    <>
                        <Fade className="w-full">
                            <SkeletonText
                                loading={false}
                                seed={seed}
                                preset="media-row"
                            >
                                <Marquee mode="bounce" grow>
                                    <TextButton
                                        size="2"
                                        weight="medium"
                                        interactive={Boolean(handleRowClick)}
                                        forceHover={isTitleProxyHovered}
                                        onClick={
                                            handleRowClick
                                                ? () => {
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
                        {subtitle != null && (
                            <Fade className="w-full">
                                <SkeletonText
                                    loading={false}
                                    seed={seed}
                                    preset="media-row"
                                    variant="subtitle"
                                    style={resolvedSubtitleStyle}
                                >
                                    <Marquee mode="left" grow>
                                        {subtitleText != null ? (
                                            <TextButton size="1" color="gray">
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
                    </>
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
