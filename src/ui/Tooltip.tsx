import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

type TooltipProps = {
    content: ReactNode;
    children: ReactElement;
    side?: ComponentProps<typeof BaseTooltip.Positioner>['side'];
};

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
    return (
        <BaseTooltip.Root>
            <BaseTooltip.Trigger render={children} />
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner side={side} sideOffset={6}>
                    <BaseTooltip.Popup className="z-100 rounded-control border border-border bg-surface-raised px-2 py-1 text-xs text-text shadow-xl">
                        {content}
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    );
}
