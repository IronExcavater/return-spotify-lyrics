import type { MouseEvent, ReactNode } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Checkbox, Flex, Skeleton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { useInteractiveTargetGuard } from '../hooks/useInteractiveTargetGuard';
import { SkeletonText } from './SkeletonText';

export type MediaGroupProps = {
    title: string;
    subtitle?: string;
    selection?: {
        checked: boolean | 'indeterminate';
        onCheckedChange: (checked: boolean) => void;
    };
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    children: ReactNode;
    className?: string;
    loading?: boolean;
    seed?: number;
};

const GROUP_BODY_ATTR = 'data-media-group-body';
const GROUP_IGNORE_TOGGLE_ATTR = 'data-media-group-ignore-toggle';
const GROUP_INTERACTIVE_SELECTORS = [
    `[${GROUP_IGNORE_TOGGLE_ATTR}="true"]`,
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
];
const GROUP_IGNORE_WITHIN_SELECTORS = [`[${GROUP_BODY_ATTR}="true"]`];

export function MediaGroup({
    title,
    subtitle,
    selection,
    collapsed = false,
    onToggleCollapsed,
    children,
    className,
    loading = false,
    seed = 0,
}: MediaGroupProps) {
    const showSubtitle = loading || Boolean(subtitle);
    const { isInteractiveTarget } = useInteractiveTargetGuard({
        additionalSelectors: GROUP_INTERACTIVE_SELECTORS,
        ignoreWithinSelectors: GROUP_IGNORE_WITHIN_SELECTORS,
    });
    const handleToggleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!onToggleCollapsed) return;
        if (isInteractiveTarget(event.target)) return;
        onToggleCollapsed();
    };

    return (
        <Flex
            direction="column"
            py="2"
            className={clsx(
                'rounded-3 bg-background',
                onToggleCollapsed && 'cursor-pointer',
                className
            )}
            onClick={handleToggleClick}
        >
            <Flex gap="1" px="2" align="center" className="min-w-0">
                {(selection || loading) && (
                    <Skeleton loading={loading}>
                        {selection ? (
                            <Checkbox
                                checked={selection.checked}
                                color="green"
                                size="1"
                                data-media-group-ignore-toggle="true"
                                onCheckedChange={(checked) =>
                                    selection.onCheckedChange(checked === true)
                                }
                            />
                        ) : (
                            <span className="block h-4 w-4 rounded-sm" />
                        )}
                    </Skeleton>
                )}
                <ChevronDownIcon
                    className={clsx(
                        'shrink-0 text-[--gray-10] transition-transform',
                        collapsed && '-rotate-90'
                    )}
                />
                <Flex flexGrow="1" align="center" gap="2">
                    <Flex flexGrow="1">
                        <SkeletonText
                            loading={loading}
                            seed={seed}
                            fullWidth={true}
                        >
                            <Text size="2" weight="medium" align="left">
                                {title}
                            </Text>
                        </SkeletonText>
                    </Flex>
                    {showSubtitle && (
                        <Flex flexGrow="0" justify="end">
                            <SkeletonText
                                loading={loading}
                                seed={seed}
                                variant="subtitle"
                                fullWidth={true}
                            >
                                <Text size="1" color="gray" align="right">
                                    {subtitle}
                                </Text>
                            </SkeletonText>
                        </Flex>
                    )}
                </Flex>
            </Flex>
            <CollapsiblePanel expanded={!collapsed}>
                {children}
            </CollapsiblePanel>
        </Flex>
    );
}

type PanelProps = {
    expanded: boolean;
    children: ReactNode;
};

export function CollapsiblePanel({ expanded, children }: PanelProps) {
    return (
        <div
            data-media-group-body="true"
            className={clsx(
                'grid transition-[grid-template-rows,opacity]',
                expanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
            )}
        >
            <div className="overflow-hidden">{children}</div>
        </div>
    );
}
