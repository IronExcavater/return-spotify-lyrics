import { ReactNode } from 'react';
import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { IconButton, TextField } from '@radix-ui/themes';

type Props = {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    onClear?: () => void;
    placeholder?: string;
    size?: '1' | '2' | '3';
    radius?: 'none' | 'small' | 'medium' | 'large' | 'full';
    className?: string;
    leftSlot?: ReactNode;
    rightSlot?: ReactNode;
};

export function SearchBar({
    value,
    onChange,
    onSubmit,
    onClear,
    placeholder,
    size = '2',
    radius = 'full',
    className,
    leftSlot,
    rightSlot,
}: Props) {
    const hasValue = value.trim().length > 0;

    return (
        <TextField.Root
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    onSubmit?.();
                }
            }}
            size={size}
            radius={radius}
            placeholder={placeholder}
            className={className}
        >
            <TextField.Slot side="left" pr="1">
                {leftSlot ?? (
                    <IconButton
                        size="1"
                        variant="ghost"
                        aria-label="Search"
                        onClick={() => onSubmit?.()}
                    >
                        <MagnifyingGlassIcon />
                    </IconButton>
                )}
            </TextField.Slot>
            <TextField.Slot side="right" pl="1">
                {rightSlot ??
                    (onClear && (
                        <IconButton
                            size="1"
                            variant="ghost"
                            aria-label="Clear search"
                            aria-hidden={!hasValue}
                            tabIndex={!hasValue ? -1 : 0}
                            onClick={onClear}
                        >
                            <Cross2Icon />
                        </IconButton>
                    ))}
            </TextField.Slot>
        </TextField.Root>
    );
}
