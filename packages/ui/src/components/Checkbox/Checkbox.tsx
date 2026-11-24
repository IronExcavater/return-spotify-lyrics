import type { CSSProperties } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import clsx from 'clsx';
import { Check, Minus } from '@return-spotify-lyrics/icons';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type CheckboxProps = Omit<
    BaseCheckbox.Root.Props,
    'className' | 'style' | 'render' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
        style?: CSSProperties | undefined;
    };

/** A box that a person checks, with an optional label, on Base UI's `Checkbox`. */
export default function Checkbox({
    label,
    indeterminate = false,
    disabled = false,
    className,
    style,
    ...props
}: CheckboxProps) {
    return (
        <label className={clsx('checkbox', className)} style={style}>
            <BaseCheckbox.Root
                {...props}
                indeterminate={indeterminate}
                disabled={disabled}
                data-part="box"
            >
                <BaseCheckbox.Indicator data-part="indicator">
                    {indeterminate ? (
                        <Minus aria-hidden />
                    ) : (
                        <Check aria-hidden />
                    )}
                </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>
            {label !== undefined && (
                <Text variant="label" weight="regular" data-part="label">
                    {label}
                </Text>
            )}
        </label>
    );
}
