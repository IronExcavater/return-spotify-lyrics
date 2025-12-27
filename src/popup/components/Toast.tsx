import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Cross2Icon, MinusIcon } from '@radix-ui/react-icons';
import {
    Button,
    ButtonProps,
    Card,
    CardProps,
    Flex,
    IconButton,
    Text,
} from '@radix-ui/themes';
import clsx from 'clsx';

export type ToastTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction extends Omit<ButtonProps, 'children'> {
    label: string;
    icon?: ReactNode;
}

export interface ToastProps extends Omit<CardProps, 'children'> {
    title?: ReactNode;
    description?: ReactNode;
    action?: ToastAction;
    timestamp?: string | Date;
    onDismiss?: () => void;
    dismissDisabled?: boolean;
    dismissIcon?: 'cross' | 'minimize';
    tone?: ToastTone;
    className?: string;
}

function formatTimestamp(timestamp?: string | Date) {
    if (!timestamp) return undefined;
    if (typeof timestamp === 'string') return timestamp;
    try {
        return new Intl.DateTimeFormat([], {
            hour: '2-digit',
            minute: '2-digit',
        }).format(timestamp);
    } catch {
        return timestamp.toString();
    }
}

function clampWords(content: ReactNode) {
    if (typeof content !== 'string') return content;
    const words = content.trim().split(/\s+/);
    if (words.length === 0) return '';
    if (words.length <= 7) return content;
    const trimmed = words.slice(0, 7).join(' ');
    return `${trimmed}…`;
}

export function Toast({
    title,
    description,
    action,
    timestamp,
    onDismiss,
    dismissDisabled = false,
    dismissIcon = 'minimize',
    className,
    ...cardProps
}: ToastProps) {
    const formattedTimestamp = useMemo(
        () => formatTimestamp(timestamp),
        [timestamp]
    );

    const {
        label: actionLabel,
        icon: actionIcon,
        className: actionClassName,
        size: actionSize,
        variant: actionVariant,
        ...actionProps
    } = action ?? {};

    const bodyContent = useMemo(
        () => clampWords(description ?? title),
        [description, title]
    );
    const showHeader = Boolean(actionLabel || formattedTimestamp || onDismiss);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        return () => setVisible(false);
    }, []);

    return (
        <Card
            {...cardProps}
            className={clsx(
                'relative w-full min-w-[180px] overflow-hidden border border-[var(--gray-a5)] bg-[var(--color-panel-solid)]/90 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.7)] transition-all duration-200',
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-1 opacity-0',
                className
            )}
        >
            <Flex direction="column" gap="2">
                {showHeader && (
                    <Flex align="center" gap="2" className="min-w-0 flex-wrap">
                        {actionLabel && (
                            <Button
                                {...actionProps}
                                size={actionSize ?? '1'}
                                variant={actionVariant ?? 'solid'}
                                className={clsx(
                                    'justify-center',
                                    actionClassName
                                )}
                            >
                                {actionIcon}
                                {actionLabel}
                            </Button>
                        )}

                        {formattedTimestamp && (
                            <Text
                                size="1"
                                color="gray"
                                className="text-[11px] leading-tight whitespace-nowrap"
                            >
                                {formattedTimestamp}
                            </Text>
                        )}

                        <Flex className="grow" />

                        {onDismiss && (
                            <IconButton
                                size="1"
                                variant="soft"
                                radius="full"
                                disabled={dismissDisabled}
                                aria-label="Dismiss notification"
                                onClick={onDismiss}
                                className="shrink-0"
                            >
                                {dismissIcon === 'minimize' ? (
                                    <MinusIcon />
                                ) : (
                                    <Cross2Icon />
                                )}
                            </IconButton>
                        )}
                    </Flex>
                )}

                <Flex align="start" gap="2">
                    <Flex direction="column" gap="1" className="min-w-0 flex-1">
                        {bodyContent && (
                            <Text
                                size="2"
                                color="gray"
                                className="leading-snug break-words text-[var(--gray-11)]"
                            >
                                {bodyContent}
                            </Text>
                        )}
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
}
