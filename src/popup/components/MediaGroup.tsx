import type { ReactNode } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Checkbox, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';

export type MediaGroupProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    selection?: {
        checked: boolean | 'indeterminate';
        onCheckedChange: (checked: boolean) => void;
    };
    headerStart?: ReactNode;
    headerEnd?: ReactNode;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    children: ReactNode;
    className?: string;
    headerClassName?: string;
    bodyClassName?: string;
};

export function MediaGroup({
    title,
    subtitle,
    selection,
    collapsed = false,
    onToggleCollapsed,
    children,
    className,
    headerClassName,
    bodyClassName,
}: MediaGroupProps) {
    return (
        <Flex
            direction="column"
            py="2"
            className={clsx('rounded-3 bg-background', className)}
            onClick={onToggleCollapsed}
        >
            <Flex gap="1" px="2" align="center" className={headerClassName}>
                <Checkbox
                    checked={selection.checked}
                    color="green"
                    size="1"
                    onCheckedChange={(checked) =>
                        selection.onCheckedChange(checked === true)
                    }
                />
                <ChevronDownIcon
                    className={clsx(
                        'transition-transform',
                        collapsed && '-rotate-90'
                    )}
                />
                <Text size="2" weight="medium" align="left" className="flex-1">
                    {title}
                </Text>
                <Text size="1" color="gray">
                    {subtitle}
                </Text>
            </Flex>
            <CollapsiblePanel expanded={!collapsed} className={bodyClassName}>
                {children}
            </CollapsiblePanel>
        </Flex>
    );
}

type PanelProps = {
    expanded: boolean;
    children: ReactNode;
    className?: string;
};

export function CollapsiblePanel({
    expanded,
    children,
    className,
}: PanelProps) {
    return (
        <div
            className={clsx(
                'grid transition-[grid-template-rows,opacity]',
                expanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0',
                className
            )}
        >
            <div className="overflow-hidden">{children}</div>
        </div>
    );
}
