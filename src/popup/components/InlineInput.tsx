import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface Props
    extends Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        'onChange' | 'value'
    > {
    value: string | number;
    onChange: (value: string) => void;
    usePlaceholderWidth?: boolean;
}

export const InlineInput = forwardRef<HTMLInputElement, Props>(
    (
        {
            value,
            onChange,
            className,
            placeholder,
            usePlaceholderWidth = true,
            ...rest
        },
        ref
    ) => {
        const strValue =
            value === undefined || value === null ? '' : String(value);
        const placeholderLength = placeholder ? String(placeholder).length : 0;
        const widthSource =
            strValue.length > 0 || !usePlaceholderWidth
                ? strValue.length
                : placeholderLength;
        const widthCh = Math.max(1, widthSource);

        return (
            <input
                {...rest}
                ref={ref}
                value={strValue}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                }}
                className={clsx(
                    'border-none bg-transparent px-0 py-0 text-xs outline-none',
                    className
                )}
                style={{
                    width: widthCh ? `${widthCh}ch` : undefined,
                    minWidth: '1.6ch',
                    ...(rest.style || {}),
                }}
                placeholder={placeholder}
            />
        );
    }
);

InlineInput.displayName = 'InlineInput';
