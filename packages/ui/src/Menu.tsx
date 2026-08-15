import type { ComponentProps, ReactNode } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import clsx from 'clsx';

type ContentProps = Omit<ComponentProps<typeof BaseMenu.Popup>, 'children'> & {
    children: ReactNode;
    side?: ComponentProps<typeof BaseMenu.Positioner>['side'];
    align?: ComponentProps<typeof BaseMenu.Positioner>['align'];
    sideOffset?: number;
};

function Content({
    children,
    side = 'bottom',
    align = 'start',
    sideOffset = 6,
    className,
    ...props
}: ContentProps) {
    return (
        <BaseMenu.Portal>
            <BaseMenu.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                className="z-100"
            >
                <BaseMenu.Popup
                    {...props}
                    className={clsx(
                        'min-w-40 rounded-panel border border-border bg-surface-raised p-1 text-sm text-text shadow-2xl outline-none',
                        className
                    )}
                >
                    {children}
                </BaseMenu.Popup>
            </BaseMenu.Positioner>
        </BaseMenu.Portal>
    );
}

function Item({ className, ...props }: ComponentProps<typeof BaseMenu.Item>) {
    return (
        <BaseMenu.Item
            {...props}
            className={clsx(
                'flex min-h-8 cursor-default items-center gap-2 rounded-control px-2 outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-hover',
                className
            )}
        />
    );
}

function Separator({
    className,
    ...props
}: ComponentProps<typeof BaseMenu.Separator>) {
    return (
        <BaseMenu.Separator
            {...props}
            className={clsx('my-1 h-px bg-border', className)}
        />
    );
}

export const Menu = {
    Root: BaseMenu.Root,
    Trigger: BaseMenu.Trigger,
    Content,
    Item,
    Separator,
    Group: BaseMenu.Group,
    GroupLabel: BaseMenu.GroupLabel,
    CheckboxItem: BaseMenu.CheckboxItem,
    CheckboxItemIndicator: BaseMenu.CheckboxItemIndicator,
    RadioGroup: BaseMenu.RadioGroup,
    RadioItem: BaseMenu.RadioItem,
    RadioItemIndicator: BaseMenu.RadioItemIndicator,
    SubmenuRoot: BaseMenu.SubmenuRoot,
    SubmenuTrigger: BaseMenu.SubmenuTrigger,
};
