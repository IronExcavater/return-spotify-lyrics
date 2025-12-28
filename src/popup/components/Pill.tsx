import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

export type PillValue =
    | { type: 'text'; value: string }
    | { type: 'single-select'; value: string }
    | { type: 'multi-select'; value: string[] }
    | { type: 'number'; value: number | null }
    | { type: 'date'; value: string }
    | { type: 'date-range'; value: { from?: string; to?: string } };

interface PillProps {
    label?: string;
    value: PillValue;
    placeholder?: string;
    onChange?: (value: PillValue) => void;
    onRemove?: () => void;
    className?: string;
}

export function Pill({
    label,
    value,
    placeholder = 'Type to edit',
    onChange,
    onRemove,
    className,
}: PillProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(
        value.type === 'text' ? value.value : ''
    );
    const inputRef = useRef<HTMLInputElement>(null);

    const isTextValue = value.type === 'text';
    const editable = isTextValue && typeof onChange === 'function';

    useEffect(() => {
        if (value.type === 'text' && !isEditing) setDraft(value.value);
    }, [value, isEditing]);

    useEffect(() => {
        if (!isEditing) return;
        inputRef.current?.focus();
        inputRef.current?.select();
    }, [isEditing]);

    const displayValue = useMemo(() => {
        switch (value.type) {
            case 'text':
                return value.value;
            case 'single-select':
                return value.value;
            case 'multi-select':
                return value.value.join(', ');
            case 'number':
                return value.value != null ? String(value.value) : '';
            case 'date':
                return value.value;
            case 'date-range': {
                const from = value.value.from ?? '';
                const to = value.value.to ?? '';
                if (from && to) return `${from} – ${to}`;
                return from || to;
            }
            default:
                return '';
        }
    }, [value]);

    const commitDraft = () => {
        if (!editable) return;
        onChange?.({ ...value, value: draft });
        setIsEditing(false);
    };

    const cancelDraft = () => {
        if (value.type === 'text') setDraft(value.value);
        setIsEditing(false);
    };

    const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!editable) return;
        if (
            event.target instanceof HTMLElement &&
            event.target.closest('input')
        )
            return;
        if (isEditing) commitDraft();
        else setIsEditing(true);
    };

    const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!editable) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (isEditing) commitDraft();
        else setIsEditing(true);
    };

    const baseLength =
        draft.length || (isTextValue ? value.value.length : 0) || 0;
    const inputWidthCh = Math.max(baseLength, 1);

    return (
        <Flex
            align="center"
            gap="1"
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : -1}
            onClick={handleContainerClick}
            onKeyDown={handleContainerKeyDown}
            className={clsx(
                'group text-gray-12 min-w-0 items-center rounded-full border border-[var(--gray-a6)] bg-[var(--gray-a2)] px-[6px] py-[2px] shadow-[0_1px_0_var(--gray-a3)] transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-a5)] focus-within:ring-offset-0',
                editable && 'cursor-text hover:border-[var(--gray-a7)]',
                className
            )}
        >
            {label && (
                <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="shrink-0"
                >
                    {label}
                </Text>
            )}

            {isEditing && editable ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitDraft();
                        } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelDraft();
                        }
                    }}
                    className="placeholder:text-gray-10 border-none bg-transparent px-0 text-[12px] leading-[16px] font-medium text-[var(--gray-12)] outline-none"
                    placeholder={placeholder}
                    aria-label={label ?? 'Edit filter'}
                    style={{ width: `${inputWidthCh}ch` }}
                    onClick={(event) => event.stopPropagation()}
                />
            ) : (
                <Text
                    size="1"
                    weight="medium"
                    color={displayValue ? undefined : 'gray'}
                    className="min-w-0 truncate"
                >
                    {displayValue || placeholder}
                </Text>
            )}

            {onRemove && (
                <IconButton
                    size="1"
                    variant="ghost"
                    radius="full"
                    aria-label="Remove filter"
                    className="text-gray-11 hover:text-gray-12 h-4 w-4 shrink-0 p-0"
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                    }}
                >
                    <Cross2Icon />
                </IconButton>
            )}
        </Flex>
    );
}
