import { ReactNode } from 'react';
import { PlayIcon } from '@radix-ui/react-icons';
import { Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { Marquee } from './Marquee';

interface Props {
    title: string;
    subtitle?: string;
    meta?: string;
    imageUrl?: string;
    imageShape?: 'square' | 'round';
    variant?: 'tile' | 'row';
    onClick?: () => void;
    onPlay?: () => void;
    action?: ReactNode;
    icon?: ReactNode;
}

export function MediaCard({
    title,
    subtitle,
    meta,
    imageUrl,
    imageShape = 'square',
    variant = 'tile',
    onClick,
    onPlay,
    action,
    icon,
}: Props) {
    const clickable = Boolean(onClick);
    const isRow = variant === 'row';
    const imageSize = isRow ? 'h-9 w-9 min-w-[36px]' : 'h-24 w-24 min-w-[96px]';
    const imageRadius = imageShape === 'round' ? 'rounded-full' : 'rounded-xl';

    const imageElement = imageUrl ? (
        <img
            src={imageUrl}
            alt={title}
            className={clsx(imageSize, imageRadius, 'shrink-0 object-cover')}
        />
    ) : (
        <div
            className={clsx(
                imageSize,
                imageRadius,
                'flex shrink-0 items-center justify-center'
            )}
        >
            <Text size="2" color="gray">
                {icon}
            </Text>
        </div>
    );

    const playButton =
        onPlay && !isRow ? (
            <button
                type="button"
                aria-label="Play"
                tabIndex={-1}
                onClick={(event) => {
                    event.stopPropagation();
                    onPlay?.();
                }}
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
            >
                <PlayIcon className="text-white" />
            </button>
        ) : null;

    const image = !isRow ? (
        <div className="group relative w-fit">
            {imageElement}
            {playButton}
        </div>
    ) : (
        imageElement
    );

    const content = isRow ? (
        <Flex align="center" gap="2" className="min-w-0">
            {image}
            <Flex direction="column" gap="1" className="min-w-0 flex-1">
                <Marquee className="w-full">
                    <Text size="2" weight="medium" as="span">
                        {title}
                    </Text>
                </Marquee>
                {subtitle && (
                    <Marquee className="w-full">
                        <Text size="1" color="gray" as="span">
                            {subtitle}
                        </Text>
                    </Marquee>
                )}
            </Flex>
            {(meta || action) && (
                <Flex align="center" gap="2" className="flex-none">
                    {meta && (
                        <Text
                            size="1"
                            color="gray"
                            as="p"
                            className="max-w-[40%] truncate text-right"
                        >
                            {meta}
                        </Text>
                    )}
                    {action}
                </Flex>
            )}
        </Flex>
    ) : (
        <Flex direction="column" gap="2" className="min-w-0">
            {image}
            <Flex direction="column" gap="1" className="min-w-0">
                <Marquee className="w-full">
                    <Text size="2" weight="medium" as="span">
                        {title}
                    </Text>
                </Marquee>
                {subtitle && (
                    <Marquee className="w-full">
                        <Text size="1" color="gray" as="span">
                            {subtitle}
                        </Text>
                    </Marquee>
                )}
                {meta && (
                    <Marquee className="w-full">
                        <Text size="1" color="gray" as="span">
                            {meta}
                        </Text>
                    </Marquee>
                )}
            </Flex>
        </Flex>
    );

    const cardClassName = clsx(
        'block appearance-none border-0 bg-transparent p-0 text-left',
        isRow ? 'w-full' : 'w-24 min-w-24 shrink-0',
        clickable && 'cursor-pointer'
    );

    if (clickable) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onClick?.();
                    }
                }}
                className={cardClassName}
            >
                {content}
            </div>
        );
    }

    return <div className={cardClassName}>{content}</div>;
}
