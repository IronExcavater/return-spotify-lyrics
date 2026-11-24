import type { CSSProperties } from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import clsx from 'clsx';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type SwitchProps = Omit<
    BaseSwitch.Root.Props,
    'className' | 'style' | 'render' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
        style?: CSSProperties | undefined;
    };

/** A switch that turns a setting on or off at once, with an optional label, on Base UI's `Switch`. */
export default function Switch({
    label,
    disabled = false,
    className,
    style,
    ...props
}: SwitchProps) {
    return (
        <label className={clsx('switch', className)} style={style}>
            {label !== undefined && (
                <Text variant="label" weight="regular" data-part="label">
                    {label}
                </Text>
            )}
            <BaseSwitch.Root {...props} disabled={disabled} data-part="track">
                <BaseSwitch.Thumb data-part="thumb" />
            </BaseSwitch.Root>
        </label>
    );
}
