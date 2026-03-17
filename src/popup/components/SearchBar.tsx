import { ReactNode, type Ref } from 'react';
import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { IconButton, Kbd, TextField } from '@radix-ui/themes';
import clsx from 'clsx';

import { getPrimaryModifierLabel } from '../../shared/platform';

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
    inputRef?: Ref<HTMLInputElement>;
    showShortcut?: boolean;
    searchAriaLabel?: string;
    clearAriaLabel?: string;
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
    inputRef,
    showShortcut = false,
    searchAriaLabel = 'Search',
    clearAriaLabel = 'Clear search',
}: Props) {
    const hasValue = value.trim().length > 0;
    const affordanceSizeClassName =
        size === '1' ? 'h-5 w-5' : size === '3' ? 'h-7 w-7' : 'h-6 w-6';
    const modifierLabel = getPrimaryModifierLabel();
    const clearNode =
        rightSlot ??
        (onClear ? (
            <IconButton
                size="1"
                variant="ghost"
                aria-label={clearAriaLabel}
                aria-hidden={!hasValue}
                tabIndex={!hasValue ? -1 : 0}
                onClick={onClear}
            >
                <Cross2Icon />
            </IconButton>
        ) : null);

    return (
        <div className={clsx('group w-full max-w-full min-w-0', className)}>
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
                className="box-border w-full min-w-0 overflow-hidden"
                ref={inputRef}
            >
                <TextField.Slot side="left" pr="1">
                    {leftSlot ?? (
                        <IconButton
                            size="1"
                            variant="ghost"
                            aria-label={searchAriaLabel}
                            onClick={() => onSubmit?.()}
                        >
                            <MagnifyingGlassIcon />
                        </IconButton>
                    )}
                </TextField.Slot>
                <TextField.Slot side="right" pl="1">
                    <div
                        className={clsx(
                            'relative shrink-0',
                            affordanceSizeClassName
                        )}
                    >
                        {showShortcut && (
                            <div
                                className={clsx(
                                    'pointer-events-none absolute inset-0 flex scale-[0.6] items-center justify-end pr-0.5 opacity-0 transition-[opacity,transform] duration-200 ease-out',
                                    !hasValue &&
                                        'group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:scale-100 group-hover:opacity-100'
                                )}
                            >
                                <Kbd size="1" className="text-gray-11">
                                    {modifierLabel} K
                                </Kbd>
                            </div>
                        )}
                        {clearNode && (
                            <div
                                className={clsx(
                                    'absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ease-out',
                                    hasValue
                                        ? 'pointer-events-auto scale-100 opacity-100'
                                        : 'pointer-events-none scale-[0.6] opacity-0'
                                )}
                            >
                                {clearNode}
                            </div>
                        )}
                    </div>
                </TextField.Slot>
            </TextField.Root>
        </div>
    );
}
