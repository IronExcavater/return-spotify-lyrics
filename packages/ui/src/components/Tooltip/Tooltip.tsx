import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import clsx from 'clsx';
import type { FloatingProps } from '../../helpers/floating';
import Text from '../Text/Text';

export type TooltipProps = FloatingProps & {
    /** The text that the tooltip shows. A tooltip only shows, so the trigger needs an accessible name that matches it. */
    label: ReactNode;
    /** The element that the tooltip belongs to, like an icon Button. */
    children: ReactElement;
    /** How long a pointer rests on the trigger before the tooltip opens, in milliseconds. Without it, the TooltipProvider's delay applies. Focus opens it at once. */
    delay?: number | undefined;
    /** How long the tooltip stays after the pointer leaves, in milliseconds. Without it, the TooltipProvider's delay applies. */
    closeDelay?: number | undefined;
    /** Whether the tooltip is open, for a tooltip that the parent controls. */
    open?: boolean | undefined;
    /** Called when the tooltip opens or closes. */
    onOpenChange?: ((open: boolean) => void) | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

/** A short hint that shows when a person points at or focuses an element, on Base UI's `Tooltip`. */
export default function Tooltip({
    label,
    children,
    // The delays have no default here, so a TooltipProvider can set them for every tooltip inside it.
    delay,
    closeDelay,
    open,
    onOpenChange,
    side = 'top',
    align = 'center',
    gap = 8,
    showArrow = false,
    className,
    style,
}: TooltipProps) {
    return (
        <BaseTooltip.Root
            open={open}
            onOpenChange={(next) => onOpenChange?.(next)}
        >
            <BaseTooltip.Trigger
                render={children}
                delay={delay}
                closeDelay={closeDelay}
            />
            <BaseTooltip.Portal>
                <BaseTooltip.Positioner
                    className="tooltip-positioner"
                    side={side}
                    align={align}
                    sideOffset={gap}
                    collisionPadding={8}
                >
                    <BaseTooltip.Popup
                        className={clsx('tooltip', className)}
                        style={style}
                    >
                        {showArrow && <BaseTooltip.Arrow data-part="arrow" />}
                        <Text inline>{label}</Text>
                    </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
            </BaseTooltip.Portal>
        </BaseTooltip.Root>
    );
}
