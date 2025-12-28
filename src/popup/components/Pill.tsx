import {
    useEffect,
    useMemo,
    useRef,
    useState,
    useLayoutEffect,
    type MouseEvent as ReactMouseEvent,
    type KeyboardEvent as ReactKeyboardEvent,
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

interface Props {
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
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
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

    const [draft, setDraft] = useState(
        value.type === 'text' ? value.value : ''
    );
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [inputPx, setInputPx] = useState<number | null>(null);
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

    useLayoutEffect(() => {
        const node = measureRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        // Subtract a tiny amount to avoid extra pixel padding from measurement quirks.
        const width = Math.max(8, Math.ceil(rect.width) - 1);
        setInputPx(width);
    }, [draft, placeholder, displayValue]);

    const commitDraft = () => {
        if (!editable) return;
        onChange?.({ ...value, value: draft });
        setIsEditing(false);
    };

    const cancelDraft = () => {
        if (value.type === 'text') setDraft(value.value);
        setIsEditing(false);
    };

    const handleContainerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!editable) return;
        if (
            event.target instanceof HTMLElement &&
            event.target.closest('input')
        )
            return;
        if (!isEditing) setIsEditing(true);
    };

    const handleContainerKeyDown = (
        event: ReactKeyboardEvent<HTMLDivElement>
    ) => {
        if (!editable) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!isEditing) setIsEditing(true);
    };

    const handleBlur = () => {
        commitDraft();
    };

    return (
        <Flex
            align="center"
            gap="1"
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : -1}
            onClick={handleContainerClick}
            onKeyDown={handleContainerKeyDown}
            className={clsx(
                'group text-gray-12 max-w-60 min-w-0 items-center rounded-full bg-[var(--gray-a2)] p-0.5 ring-1 ring-[var(--gray-a6)] transition-colors',
                'focus-within:ring-2 focus-within:ring-[var(--accent-8)] hover:ring-2 hover:ring-[var(--accent-8)] focus-visible:outline-none',
                editable &&
                    'cursor-text focus-within:border-[var(--accent-8)] hover:border-[var(--accent-8)]',
                className
            )}
        >
            {label && (
                <Text size="1" weight="medium" color="gray" className="pl-1">
                    {label}
                </Text>
            )}

            {isEditing && editable ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitDraft();
                        } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelDraft();
                        }
                    }}
                    placeholder={placeholder}
                    style={inputPx ? { width: `${inputPx}px` } : undefined}
                    onClick={(event) => event.stopPropagation()}
                    className="min-w-0 border-none bg-transparent text-xs font-normal outline-none"
                />
            ) : (
                <Text
                    size="1"
                    color={displayValue ? undefined : 'gray'}
                    className="min-w-0 truncate"
                >
                    {displayValue || placeholder}
                </Text>
            )}

            <span
                ref={measureRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 -z-10 text-xs leading-[16px] font-normal whitespace-pre opacity-0"
            >
                {draft || placeholder}
            </span>

            {onRemove && (
                <IconButton
                    size="1"
                    variant="ghost"
                    radius="full"
                    className="h-3 w-3 p-0 [&>svg]:h-2.5 [&>svg]:w-2.5"
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
