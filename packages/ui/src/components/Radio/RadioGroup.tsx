import { useId, type CSSProperties, type ReactNode } from 'react';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import clsx from 'clsx';
import Text from '../Text/Text';

export type RadioGroupProps<Value = string> = Omit<
    BaseRadioGroup.Props<Value>,
    'className' | 'style' | 'render'
> & {
    /** The text that names the group, above the options. */
    label?: ReactNode;
    /** How the options line up. The arrow keys move through them in both. */
    orientation?: 'vertical' | 'horizontal';
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

/** A group of Radio options where a person chooses one, on Base UI's `RadioGroup`. */
export default function RadioGroup<Value = string>({
    label,
    orientation = 'vertical',
    disabled = false,
    className,
    children,
    ...props
}: RadioGroupProps<Value>) {
    const labelId = useId();
    const hasLabel = label !== undefined;

    return (
        <BaseRadioGroup
            aria-labelledby={hasLabel ? labelId : undefined}
            {...props}
            disabled={disabled}
            className={clsx('radio-group', className)}
            data-orientation={orientation}
        >
            {hasLabel && (
                <Text id={labelId} variant="label" data-part="label">
                    {label}
                </Text>
            )}
            <div data-part="options">{children}</div>
        </BaseRadioGroup>
    );
}
