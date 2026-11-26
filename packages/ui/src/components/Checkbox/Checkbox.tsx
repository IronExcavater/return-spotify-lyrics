import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import clsx from 'clsx';
import { Check, Minus } from '@return-spotify-lyrics/icons';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type CheckboxProps = Omit<
    BaseCheckbox.Root.Props,
    'className' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
    };

/** A box that a person checks, with an optional label, on Base UI's `Checkbox`. The label is part of the control. */
export default function Checkbox({
    label,
    indeterminate = false,
    disabled = false,
    className,
    ...props
}: CheckboxProps) {
    return (
        <BaseCheckbox.Root
            {...props}
            indeterminate={indeterminate}
            disabled={disabled}
            className={clsx('checkbox', className)}
        >
            <span data-part="box">
                {/* The mark stays in the box when unchecked, so the box's baseline and its line keep their place. */}
                <BaseCheckbox.Indicator data-part="indicator" keepMounted>
                    {indeterminate ? (
                        <Minus aria-hidden />
                    ) : (
                        <Check aria-hidden />
                    )}
                </BaseCheckbox.Indicator>
            </span>
            {label !== undefined && (
                <Text inline data-part="label">
                    {label}
                </Text>
            )}
        </BaseCheckbox.Root>
    );
}
