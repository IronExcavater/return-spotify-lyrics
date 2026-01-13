import type { ReactNode } from 'react';
import { Button, Flex, Text } from '@radix-ui/themes';

import { InlineInput } from './InlineInput';

type StepperControlProps = {
    label: string;
    value: string | number;
    placeholder: string;
    onDecrement: () => void;
    onIncrement: () => void;
    onValueChange: (val: string) => void;
    onValueBlur: () => void;
    onValueFocus: () => void;
    hideSteppers?: boolean;
    suffix?: ReactNode;
};

export function StepperControl({
    label,
    value,
    placeholder,
    onDecrement,
    onIncrement,
    onValueChange,
    onValueBlur,
    onValueFocus,
    hideSteppers = false,
    suffix,
}: StepperControlProps) {
    return (
        <Flex align="center">
            <Text size="1" color="gray" mr="1">
                {label}
            </Text>
            {!hideSteppers && (
                <Button
                    size="0"
                    variant="ghost"
                    radius="small"
                    onClick={onDecrement}
                >
                    –
                </Button>
            )}
            <InlineInput
                value={value}
                placeholder={placeholder}
                usePlaceholderWidth
                onChange={onValueChange}
                onBlur={onValueBlur}
                onFocus={onValueFocus}
                className="text-center"
            />
            {!hideSteppers && (
                <Button
                    size="0"
                    variant="ghost"
                    radius="small"
                    onClick={onIncrement}
                >
                    +
                </Button>
            )}
            {suffix}
        </Flex>
    );
}
