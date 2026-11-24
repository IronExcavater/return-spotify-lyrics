import { Switch as BaseSwitch } from '@base-ui/react/switch';
import clsx from 'clsx';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type SwitchProps = Omit<
    BaseSwitch.Root.Props,
    'className' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
    };

/** A switch that turns a setting on or off at once, with an optional label, on Base UI's `Switch`. The label is part of the control. */
export default function Switch({
    label,
    disabled = false,
    className,
    ...props
}: SwitchProps) {
    return (
        <BaseSwitch.Root
            {...props}
            disabled={disabled}
            className={clsx('switch', className)}
        >
            {label !== undefined && (
                <Text inline data-part="label">
                    {label}
                </Text>
            )}
            <span data-part="track">
                <BaseSwitch.Thumb data-part="thumb" />
            </span>
        </BaseSwitch.Root>
    );
}
