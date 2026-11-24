import { Radio as BaseRadio } from '@base-ui/react/radio';
import clsx from 'clsx';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type RadioProps<Value = string> = Omit<
    BaseRadio.Root.Props<Value>,
    'className' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
    };

/** One option of a RadioGroup, with an optional label, on Base UI's `Radio`. The label is part of the control. */
export default function Radio<Value = string>({
    label,
    disabled = false,
    className,
    ...props
}: RadioProps<Value>) {
    return (
        <BaseRadio.Root
            {...props}
            disabled={disabled}
            className={clsx('radio', className)}
        >
            <span data-part="circle">
                <BaseRadio.Indicator data-part="indicator" />
            </span>
            {label !== undefined && (
                <Text inline data-part="label">
                    {label}
                </Text>
            )}
        </BaseRadio.Root>
    );
}
