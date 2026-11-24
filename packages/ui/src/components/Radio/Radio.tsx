import type { CSSProperties } from 'react';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import clsx from 'clsx';
import type { LabelProps } from '../../helpers/label';
import Text from '../Text/Text';

export type RadioProps<Value = string> = Omit<
    BaseRadio.Root.Props<Value>,
    'className' | 'style' | 'render' | 'children'
> &
    LabelProps & {
        className?: string | undefined;
        style?: CSSProperties | undefined;
    };

/** One option of a RadioGroup, with an optional label, on Base UI's `Radio`. */
export default function Radio<Value = string>({
    label,
    disabled = false,
    className,
    style,
    ...props
}: RadioProps<Value>) {
    return (
        <label className={clsx('radio', className)} style={style}>
            <BaseRadio.Root {...props} disabled={disabled} data-part="circle">
                <BaseRadio.Indicator data-part="indicator" />
            </BaseRadio.Root>
            {label !== undefined && (
                <Text variant="label" weight="regular" data-part="label">
                    {label}
                </Text>
            )}
        </label>
    );
}
