import {
    useState,
    type CSSProperties,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { DotsHorizontalIcon, PlayIcon } from '@radix-ui/react-icons';
import {
    Checkbox,
    DropdownMenu,
    Flex,
    IconButton,
    Skeleton,
} from '@radix-ui/themes';
import clsx from 'clsx';

import type { MediaPrimaryAction } from '../../../shared/types';
import { handleMenuTriggerKeyDown } from '../../hooks/useActions';
import { useInteractiveTargetGuard } from '../../hooks/useInteractiveTargetGuard';
import { AvatarButton } from '../AvatarButton';
import { Fade } from '../Fade';
import { Marquee } from '../Marquee';
import { SkeletonText } from '../SkeletonText';
import { TextButton } from '../TextButton';
import { getAvatarFallback, getAvatarRadius } from './mediaAvatar';

export interface MediaRowProps {
    title?: string;
    subtitle?: ReactNode;
    subtitleHeight?: number;
    imageUrl?: string;
    icon?: ReactNode;
    imageShape?: 'round' | 'square';
    showImage?: boolean;
    onClick?: () => void;
    onTitleClick?: () => void;
    loading?: boolean;
    contextMenu?: ReactNode;
    contextMenuDisabled?: boolean;
    primaryAction?: MediaPrimaryAction;
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

function PrimaryPlayButton({
    action,
    visible,
}: {
    action?: MediaPrimaryAction;
    visible: boolean;
}) {
    if (!action) return null;

    return (
        <IconButton
            data-title-hover-stop="true"
            data-media-secondary-action="true"
            type="button"
            size="1"
            variant="ghost"
            radius="full"
            color="gray"
            disabled={action.disabled}
            onClick={(event) => {
                event.stopPropagation();
                if (action.disabled) return;
                action.onSelect();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={clsx(
                'absolute inset-0 m-auto opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
                visible && 'opacity-100'
            )}
            aria-label={action.label ?? 'Play'}
        >
            <PlayIcon />
        </IconButton>
    );
}

function MediaRowPosition({
    label,
    selection,
    showSelection,
    primaryAction,
    primaryActionVisible,
}: {
    label: string;
    selection?: MediaRowSelection;
    showSelection: boolean;
    primaryAction?: MediaPrimaryAction;
    primaryActionVisible: boolean;
}) {
    if (!selection) {
        return (
            <div className="relative flex h-8 w-9 items-center justify-center">
                <span
                    className={clsx(
                        POSITION_LABEL_CLASS_NAME,
                        primaryActionVisible && 'opacity-0'
                    )}
                >
                    {label}
                </span>
                <PrimaryPlayButton
                    action={primaryAction}
                    visible={primaryActionVisible}
                />
            </div>
        );
    }

    return (
        <div className="relative flex h-8 w-9 flex-col items-center justify-center overflow-hidden">
            <div
                className={clsx(
                    'flex min-w-[4ch] justify-center transition-transform',
                    showSelection ? '-translate-y-0.5' : 'translate-y-1.5',
                    primaryActionVisible && 'opacity-0'
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
            <PrimaryPlayButton
                action={primaryAction}
                visible={primaryActionVisible}
            />
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
    onTitleClick,
    loading = false,
    contextMenu,
    contextMenuDisabled = false,
    primaryAction,
    className,
    style,
    seed = 0,
    showPosition = false,
    position,
    selection,
}: MediaRowProps) {
    const radius = getAvatarRadius(imageShape);
    const avatarFallback = getAvatarFallback(icon, title);
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
    const handleTitleClick = loading
        ? undefined
        : (onTitleClick ?? handleRowClick);
    const [isRowHovered, setIsRowHovered] = useState(false);
    const [isTitleProxyHovered, setIsTitleProxyHovered] = useState(false);
    const [isSecondaryHovered, setIsSecondaryHovered] = useState(false);
    const { isInteractiveTarget } = useInteractiveTargetGuard();
    const showSelection = Boolean(
        selection && (selection.checked || isRowHovered)
    );
    const showPrimaryAction =
        !loading &&
        Boolean(primaryAction) &&
        !isSecondaryHovered &&
        (isRowHovered || showSelection);
    const positionLabel = Number.isFinite(position)
        ? String(Number(position) + 1)
        : '';

    const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!handleRowClick) return;
        if (isInteractiveTarget(event.target)) return;
        handleRowClick();
    };

    const updateTitleProxyHover = (target: EventTarget | null) => {
        const next = Boolean(handleTitleClick) && !isInteractiveTarget(target);
        setIsTitleProxyHovered((previous) =>
            previous === next ? previous : next
        );
    };

    const updateSecondaryHover = (target: EventTarget | null) => {
        const element = target instanceof Element ? target : null;
        const next = Boolean(
            element?.closest('[data-media-secondary-action="true"]')
        );
        setIsSecondaryHovered((previous) =>
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
                updateSecondaryHover(event.target);
            }}
            onPointerMove={(event) => {
                updateTitleProxyHover(event.target);
                updateSecondaryHover(event.target);
            }}
            onPointerLeave={() => {
                setIsRowHovered(false);
                setIsTitleProxyHovered(false);
                setIsSecondaryHovered(false);
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
                        primaryAction={primaryAction}
                        primaryActionVisible={showPrimaryAction}
                    />
                </Flex>
            )}
            {showImage && (
                <Skeleton loading={loading}>
                    <AvatarButton
                        avatar={{
                            src: imageUrl,
                            fallback: avatarFallback,
                            radius,
                            size: '3',
                        }}
                        aria-label={title}
                        hideRing
                        tabIndex={-1}
                        disabled={primaryAction?.disabled}
                        onClick={
                            primaryAction
                                ? (event) => {
                                      event.stopPropagation();
                                      if (primaryAction.disabled) return;
                                      primaryAction.onSelect();
                                  }
                                : undefined
                        }
                        overlayPointerEvents="none"
                    >
                        {!showPosition && primaryAction && (
                            <Flex
                                align="center"
                                justify="center"
                                className="pointer-events-none absolute inset-0"
                            >
                                <Flex
                                    className={clsx(
                                        'bg-panel-solid/10 rounded-full text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
                                        showPrimaryAction && 'opacity-100'
                                    )}
                                    p="1"
                                >
                                    <PlayIcon />
                                </Flex>
                            </Flex>
                        )}
                    </AvatarButton>
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
                                        interactive={Boolean(handleTitleClick)}
                                        forceHover={isTitleProxyHovered}
                                        onClick={
                                            handleTitleClick
                                                ? () => {
                                                      handleTitleClick();
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
                            data-media-secondary-action="true"
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
