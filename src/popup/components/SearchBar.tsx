import { ReactNode, useState, type Ref } from 'react';
import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { IconButton, Kbd, TextField } from '@radix-ui/themes';

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
}: Props) {
    const hasValue = value.trim().length > 0;
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const showShortcutBadge = showShortcut && (isFocused || isHovered);
    const showShortcutVisible = showShortcutBadge && !hasValue;
    const modifierLabel = getPrimaryModifierLabel();
    const clearNode =
        rightSlot ??
        (onClear ? (
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
        ) : null);

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
            ref={inputRef}
            onFocusCapture={() => setIsFocused(true)}
            onBlurCapture={() => setIsFocused(false)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                <div className="relative h-6 w-6">
                    {showShortcut && (
                        <div
                            className="pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ease-out"
                            style={{
                                transform: showShortcutVisible
                                    ? 'scale(1)'
                                    : 'scale(0.6)',
                                opacity: showShortcutVisible ? 1 : 0,
                            }}
                        >
                            <Kbd size="1" className="text-gray-11">
                                {modifierLabel} K
                            </Kbd>
                        </div>
                    )}
                    {clearNode && (
                        <div
                            className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out"
                            style={{
                                transform: hasValue ? 'scale(1)' : 'scale(0.6)',
                                opacity: hasValue ? 1 : 0,
                                pointerEvents: hasValue ? 'auto' : 'none',
                            }}
                        >
                            {clearNode}
                        </div>
                    )}
                </div>
            </TextField.Slot>
        </TextField.Root>
    );
}
