import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import clsx from 'clsx';
import type { FloatingProps } from '../../helpers/floating';
import Text from '../Text/Text';

export type PopoverProps = Omit<
    BasePopover.Popup.Props,
    'className' | 'style' | 'children' | 'render' | 'content'
> &
    FloatingProps & {
        /** The element that the popover wraps and that opens it, like a Button. */
        children: ReactElement;
        /** What the popover shows when it opens. */
        content?: ReactNode;
        /** A heading that names the popover. Without one, give the popover an `aria-label`. */
        title?: ReactNode;
        /** Whether the popover is open, for a popover that the parent controls. */
        open?: boolean | undefined;
        /** Whether the popover is open at first. */
        defaultOpen?: boolean;
        /** Called when the popover opens or closes. */
        onOpenChange?: ((open: boolean) => void) | undefined;
        className?: string | undefined;
        style?: CSSProperties | undefined;
    };

/**
 * A floating panel that the element it wraps opens, on Base UI's `Popover`. Focus moves into it, Escape and a click
 * outside close it, and focus goes back to the element.
 */
export default function Popover({
    children,
    content,
    title,
    open,
    defaultOpen = false,
    onOpenChange,
    side = 'bottom',
    align = 'center',
    gap = 8,
    showArrow = false,
    className,
    ...props
}: PopoverProps) {
    return (
        <BasePopover.Root
            open={open}
            defaultOpen={defaultOpen}
            onOpenChange={(next) => onOpenChange?.(next)}
        >
            <BasePopover.Trigger render={children} />
            <BasePopover.Portal>
                <BasePopover.Positioner
                    className="popover-positioner"
                    side={side}
                    align={align}
                    sideOffset={gap}
                    collisionPadding={8}
                >
                    <BasePopover.Popup
                        {...props}
                        className={clsx('popover', className)}
                    >
                        {showArrow && <BasePopover.Arrow data-part="arrow" />}
                        {title !== undefined && (
                            <BasePopover.Title data-part="title">
                                <Text inline>{title}</Text>
                            </BasePopover.Title>
                        )}
                        {content}
                    </BasePopover.Popup>
                </BasePopover.Positioner>
            </BasePopover.Portal>
        </BasePopover.Root>
    );
}
