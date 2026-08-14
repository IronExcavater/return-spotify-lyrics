import type { ComponentProps, ReactNode } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import clsx from 'clsx';

type ContentProps = Omit<
    ComponentProps<typeof BasePopover.Popup>,
    'children'
> & {
    children: ReactNode;
    side?: ComponentProps<typeof BasePopover.Positioner>['side'];
    align?: ComponentProps<typeof BasePopover.Positioner>['align'];
    sideOffset?: number;
    showArrow?: boolean;
};

function Content({
    children,
    side = 'bottom',
    align = 'center',
    sideOffset = 8,
    showArrow = true,
    className,
    ...props
}: ContentProps) {
    return (
        <BasePopover.Portal>
            <BasePopover.Positioner
                side={side}
                align={align}
                sideOffset={sideOffset}
                className="z-100"
            >
                <BasePopover.Popup
                    {...props}
                    className={clsx(
                        'max-h-[min(420px,var(--available-height))] max-w-[min(360px,var(--available-width))] overflow-auto rounded-panel border border-border bg-surface-raised p-3 text-sm text-text shadow-2xl outline-none',
                        className
                    )}
                >
                    {showArrow && (
                        <BasePopover.Arrow className="size-2 rotate-45 border-t border-l border-border bg-surface-raised" />
                    )}
                    {children}
                </BasePopover.Popup>
            </BasePopover.Positioner>
        </BasePopover.Portal>
    );
}

export const Popover = {
    Root: BasePopover.Root,
    Trigger: BasePopover.Trigger,
    Content,
    Title: BasePopover.Title,
    Description: BasePopover.Description,
    Close: BasePopover.Close,
};
