import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { Toast, ToastAction, ToastProps } from './Toast';

export interface NotificationItem extends ToastProps {
    id: string;
    unread?: boolean;
    action?: ToastAction;
    persistent?: boolean;
}

interface Props {
    title?: string;
    items: NotificationItem[];
    emptyMessage?: string;
    onDismiss?: (id: string) => void;
    onAction?: (id: string) => void;
    onClearAll?: () => void;
    className?: string;
}

export function NotificationCenter({
    title = 'Notifications',
    items,
    emptyMessage = 'No notifications yet.',
    onDismiss,
    onAction,
    onClearAll,
    className,
}: Props) {
    const [index, setIndex] = useState(0);
    const visibleItems = useMemo(() => items ?? [], [items]);

    const active = visibleItems[index];
    const hasItems = visibleItems.length > 0;

    const goPrev = () => setIndex((prev) => Math.max(0, prev - 1));
    const goNext = () =>
        setIndex((prev) => Math.min(visibleItems.length - 1, prev + 1));

    const handleDismiss = () => {
        if (!active?.id || !onDismiss) return;
        onDismiss(active.id);
        setIndex((prev) =>
            prev >= visibleItems.length - 1
                ? Math.max(0, visibleItems.length - 2)
                : prev
        );
    };

    const resolvedAction =
        active?.action ||
        (active && onAction
            ? {
                  label: 'Open',
                  onClick: () => onAction(active.id),
              }
            : undefined);

    return (
        <Flex
            direction="column"
            gap="2"
            className={clsx('w-full min-w-0', className)}
        >
            <Flex align="center" justify="between" gap="3" className="min-w-0">
                <Text size="3" weight="medium" className="truncate">
                    {title}
                </Text>
                {hasItems && onClearAll && (
                    <Button size="1" variant="ghost" onClick={onClearAll}>
                        Clear all
                    </Button>
                )}
            </Flex>

            {!hasItems ? (
                <Flex
                    align="center"
                    justify="center"
                    className="w-full rounded-lg border border-dashed border-[var(--gray-a5)] px-3 py-6 text-center"
                >
                    <Text color="gray">{emptyMessage}</Text>
                </Flex>
            ) : (
                <Flex align="center" gap="1" className="w-full min-w-0">
                    <IconButton
                        size="1"
                        radius="none"
                        variant="ghost"
                        aria-label="Previous notification"
                        disabled={index === 0}
                        onClick={goPrev}
                        className="!w-6"
                    >
                        <ChevronLeftIcon />
                    </IconButton>

                    <Flex className="min-w-0 flex-1">
                        {active && (
                            <Toast
                                {...active}
                                action={resolvedAction}
                                onDismiss={active.onDismiss ?? handleDismiss}
                                dismissIcon="cross"
                                dismissDisabled={active.persistent}
                                tone={
                                    active.tone ??
                                    (active.unread ? 'info' : 'neutral')
                                }
                            />
                        )}
                    </Flex>

                    <IconButton
                        size="1"
                        radius="none"
                        variant="ghost"
                        aria-label="Next notification"
                        disabled={index >= visibleItems.length - 1}
                        onClick={goNext}
                        className="!w-6"
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Flex>
            )}

            {hasItems && (
                <Text size="1" color="gray" className="self-end text-[11px]">
                    {index + 1} / {visibleItems.length}
                </Text>
            )}
        </Flex>
    );
}
