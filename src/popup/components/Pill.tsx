import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useLayoutEffect,
    type MouseEvent as ReactMouseEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type FocusEvent as ReactFocusEvent,
    RefObject,
} from 'react';
import { Cross2Icon, MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import { DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { formatDateWithFormatter, resolveLocale } from '../../shared/date';
import type { PillValue } from '../../shared/types';
import { useSettings } from '../hooks/useSettings';
import { InlineInput } from './InlineInput';

export type { PillValue } from '../../shared/types';

type DateRangeValue = Extract<PillValue, { type: 'date-range' }>['value'];
type DateLikeValue = Extract<PillValue, { type: 'date' | 'date-range' }>;
type DateDraft = { mode: 'date' | 'date-range'; range: DateRangeValue };
type DateGranularity = 'day' | 'month' | 'year';
const EARLIEST_MUSIC_YEAR = 1900;

const todayIso = new Date().toISOString().slice(0, 10);
const minDateIso = `${EARLIEST_MUSIC_YEAR}-01-01`;

const formatDateRangeValue = (
    range: DateRangeValue,
    formatter: Intl.DateTimeFormat
) => {
    const from = formatDateWithFormatter(range.from, formatter);
    const to = formatDateWithFormatter(range.to, formatter);
    if (from && to) return `${from} to ${to}`;
    return from || to;
};

const isDateLikeValue = (value: PillValue): value is DateLikeValue =>
    value.type === 'date' || value.type === 'date-range';

type DateOrder = Array<'day' | 'month' | 'year'>;

const resolveEditPattern = (formatter: Intl.DateTimeFormat) => {
    const parts = formatter.formatToParts(new Date('2020-01-02'));
    const order = parts
        .filter(
            (part): part is Intl.DateTimeFormatPart =>
                part.type === 'day' ||
                part.type === 'month' ||
                part.type === 'year'
        )
        .map((part) => part.type as DateOrder[number]);
    const separator =
        parts.find((part) => part.type === 'literal')?.value ?? '/';
    const placeholder = order
        .map((token) => {
            if (token === 'day') return 'dd';
            if (token === 'month') return 'mm';
            return 'yyyy';
        })
        .join(separator);
    return { order, separator, placeholder };
};

const normalizeRangeValue = (range: DateRangeValue): DateRangeValue => ({
    from: range.from || undefined,
    to: range.to || undefined,
});

const clampDateToBounds = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return undefined;
    const clamped = Math.max(
        Date.parse(minDateIso),
        Math.min(Date.parse(todayIso), parsed)
    );
    return new Date(clamped).toISOString().slice(0, 10);
};

const clampRangeBounds = (range: DateRangeValue): DateRangeValue => ({
    from: clampDateToBounds(range.from),
    to: clampDateToBounds(range.to),
});

const alignRangeForMode = (
    range: DateRangeValue,
    mode: DateDraft['mode']
): DateRangeValue => {
    const normalized = normalizeRangeValue(range);
    if (mode === 'date') {
        const value = normalized.from ?? normalized.to;
        return value ? { from: value, to: value } : {};
    }
    return normalized;
};

const rangeToDateString = (range: DateRangeValue) =>
    range.from ?? range.to ?? '';

interface Props {
    label?: string;
    value: PillValue;
    placeholder?: string;
    dateGranularity?: DateGranularity;
    onChange?: (value: PillValue) => void;
    onRemove?: () => void;
    className?: string;
}

export function Pill({
    label,
    value,
    placeholder = 'Type to edit',
    dateGranularity = 'day',
    onChange,
    onRemove,
    className,
}: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const { settings } = useSettings();
    const locale = resolveLocale(settings.locale);
    const dateFormatter = useMemo(() => {
        const options =
            dateGranularity === 'year'
                ? ({ year: 'numeric' } satisfies Intl.DateTimeFormatOptions)
                : dateGranularity === 'month'
                  ? ({
                        month: 'short',
                        year: 'numeric',
                    } satisfies Intl.DateTimeFormatOptions)
                  : ({
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    } satisfies Intl.DateTimeFormatOptions);
        return new Intl.DateTimeFormat(locale, options);
    }, [dateGranularity, locale]);
    const editFormatter = useMemo(() => {
        const options =
            dateGranularity === 'year'
                ? ({ year: 'numeric' } satisfies Intl.DateTimeFormatOptions)
                : dateGranularity === 'month'
                  ? ({
                        month: '2-digit',
                        year: 'numeric',
                    } satisfies Intl.DateTimeFormatOptions)
                  : ({
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    } satisfies Intl.DateTimeFormatOptions);
        return new Intl.DateTimeFormat(locale, options);
    }, [dateGranularity, locale]);
    const editPattern = useMemo(
        () => resolveEditPattern(editFormatter),
        [editFormatter]
    );
    const formatDate = useCallback(
        (iso?: string) => formatDateWithFormatter(iso, dateFormatter),
        [dateFormatter]
    );
    const formatDateForEdit = useCallback(
        (iso?: string) => formatDateWithFormatter(iso, editFormatter),
        [editFormatter]
    );
    const formatRange = useCallback(
        (range: DateRangeValue) => formatDateRangeValue(range, dateFormatter),
        [dateFormatter]
    );
    const parseDateInput = useCallback(
        (input?: string) => {
            if (!input) return undefined;
            const trimmed = input.trim();
            if (!trimmed) return undefined;
            const segments = trimmed.split(/\D+/).filter(Boolean);
            if (segments.length < editPattern.order.length) return undefined;

            const get = (token: DateOrder[number]) => {
                const index = editPattern.order.indexOf(token);
                return index === -1 ? undefined : segments[index];
            };

            const rawDay = get('day');
            const rawMonth = get('month');
            const rawYear = get('year');
            const day = rawDay ? Number(rawDay) : 1;
            const month = rawMonth ? Number(rawMonth) : 1;
            const year = rawYear ? Number(rawYear) : 0;
            if (!year) return undefined;

            const date = new Date(Date.UTC(year, month - 1, day));
            if (
                date.getUTCFullYear() !== year ||
                date.getUTCMonth() !== month - 1 ||
                date.getUTCDate() !== day
            )
                return undefined;

            return clampDateToBounds(date.toISOString().slice(0, 10));
        },
        [editPattern.order]
    );
    const displayValue = useMemo(() => {
        if (isDateLikeValue(value)) {
            if (value.type === 'date') return formatDate(value.value);
            const formatted = formatRange(value.value);
            return formatted || formatDate(value.value.from);
        }
        switch (value.type) {
            case 'text':
                return value.value;
            case 'single-select':
                return value.value;
            case 'multi-select':
                return value.value.join(', ');
            case 'number':
                return value.value != null ? String(value.value) : '';
            case 'options': {
                const count = value.value.length;
                if (!count) return '';
                if (count <= 2) return value.value.join(', ');
                return `${value.value.slice(0, 2).join(', ')} +${count - 2}`;
            }
            default:
                return '';
        }
    }, [value, formatDate, formatRange]);

    const [textDraft, setTextDraft] = useState(
        value.type === 'text' ? value.value : ''
    );
    const [dateDraft, setDateDraft] = useState<DateDraft>({
        mode: 'date',
        range: {},
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownContentRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const dateFromMeasureRef = useRef<HTMLSpanElement>(null);
    const dateToMeasureRef = useRef<HTMLSpanElement>(null);
    const [dateWidths, setDateWidths] = useState({ from: 0, to: 0 });
    const [inputPx, setInputPx] = useState<number | null>(null);
    const isTextValue = value.type === 'text';
    const isDateValue = isDateLikeValue(value);
    const isOptionsValue = value.type === 'options';
    const isRangeMode = dateDraft.mode === 'date-range';
    const editable =
        (isTextValue || isDateValue || isOptionsValue) &&
        typeof onChange === 'function';

    useEffect(() => {
        if (value.type === 'text' && !isEditing) setTextDraft(value.value);
    }, [value, isEditing]);

    useEffect(() => {
        if (!isDateValue || isEditing) return;
        if (value.type === 'date') {
            const formatted = formatDateForEdit(value.value);
            setDateDraft({
                mode: 'date',
                range: { from: formatted, to: formatted },
            });
            return;
        }
        setDateDraft({
            mode: 'date-range',
            range: {
                from: formatDateForEdit(value.value.from),
                to: formatDateForEdit(value.value.to),
            },
        });
    }, [value, isEditing, isDateValue, formatDateForEdit]);

    useEffect(() => {
        if (!isEditing) return;
        if (isTextValue) {
            inputRef.current?.focus();
            inputRef.current?.select();
        } else if (isDateValue) {
            dateInputRef.current?.focus();
        }
    }, [isEditing, isTextValue, isDateValue]);

    useLayoutEffect(() => {
        if (!isTextValue) return;
        const node = measureRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        // Subtract a tiny amount to avoid extra pixel padding from measurement quirks.
        const width = Math.max(8, Math.ceil(rect.width) - 1);
        setInputPx(width);
    }, [textDraft, placeholder, displayValue, isTextValue]);
    useLayoutEffect(() => {
        if (!isDateValue) return;
        const measure = (ref: RefObject<HTMLSpanElement>) => {
            const node = ref.current;
            if (!node) return 0;
            const rect = node.getBoundingClientRect();
            return Math.max(8, Math.ceil(rect.width) - 1);
        };
        setDateWidths({
            from: measure(dateFromMeasureRef),
            to: measure(dateToMeasureRef),
        });
    }, [isDateValue, dateDraft, placeholder, displayValue]);

    const commitDraft = useCallback(() => {
        if (!editable || !onChange) return;

        if (isOptionsValue) {
            setIsEditing(false);
            return;
        }

        if (isTextValue) {
            onChange({ ...value, value: textDraft });
        } else if (isDateValue) {
            const parsed = {
                from: parseDateInput(dateDraft.range.from),
                to: parseDateInput(dateDraft.range.to),
            };
            const clamped = clampRangeBounds(parsed);
            const fixed = fixImpossibleRange(clamped);
            const range = alignRangeForMode(fixed, dateDraft.mode);
            const nextValue: PillValue =
                dateDraft.mode === 'date'
                    ? { type: 'date', value: rangeToDateString(range) }
                    : { type: 'date-range', value: range };
            onChange(nextValue);
        }

        setIsEditing(false);
    }, [
        editable,
        onChange,
        isOptionsValue,
        isTextValue,
        value,
        textDraft,
        isDateValue,
        parseDateInput,
        dateDraft.range.from,
        dateDraft.range.to,
        dateDraft.mode,
    ]);

    const cancelDraft = () => {
        if (isTextValue) setTextDraft(value.value);
        if (isDateValue) {
            if (value.type === 'date') {
                const formatted = formatDateForEdit(value.value);
                setDateDraft({
                    mode: 'date',
                    range: { from: formatted, to: formatted },
                });
            } else {
                setDateDraft({
                    mode: 'date-range',
                    range: {
                        from: formatDateForEdit(value.value.from),
                        to: formatDateForEdit(value.value.to),
                    },
                });
            }
        }
        setIsEditing(false);
    };

    useEffect(() => {
        if (!isEditing || !editable) return;
        const handleOutside = (
            event: PointerEvent | MouseEvent | TouchEvent
        ) => {
            const node = containerRef.current;
            const menuNode = dropdownContentRef.current;
            if (!node) return;
            const target = event.target as Node;
            if (node.contains(target)) return;
            if (menuNode && menuNode.contains(target)) return;
            commitDraft();
        };
        const events: Array<keyof DocumentEventMap> = [
            'pointerdown',
            'mousedown',
            'touchstart',
        ];
        events.forEach((type) =>
            document.addEventListener(type, handleOutside)
        );
        return () =>
            events.forEach((type) =>
                document.removeEventListener(type, handleOutside)
            );
    }, [isEditing, editable, commitDraft]);

    const startEditing = useCallback(
        (event?: ReactMouseEvent<HTMLElement>) => {
            if (!editable) return;
            const target = event?.target as HTMLElement | undefined;
            if (target?.closest('input')) return;
            event?.preventDefault();
            event?.stopPropagation();
            setIsEditing(true);
        },
        [editable]
    );

    const handleContainerPointerDown = (
        event: ReactMouseEvent<HTMLDivElement>
    ) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-pill-ignore-edit]')) return;
        startEditing(event);
    };

    const handleContainerKeyDown = (
        event: ReactKeyboardEvent<HTMLDivElement>
    ) => {
        if (!editable) return;
        if (event.target instanceof HTMLInputElement) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        startEditing();
    };

    const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
        if (!editable || !isEditing || isOptionsValue) return;
        const nextFocus = event.relatedTarget as Node | null;
        if (nextFocus && event.currentTarget.contains(nextFocus)) return;
        commitDraft();
    };

    const handleInputKeyDown = (
        event: ReactKeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            commitDraft();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelDraft();
        }
    };

    const setDateMode = (mode: DateDraft['mode']) => {
        setDateDraft((prev) => {
            const parsed = {
                from: parseDateInput(prev.range.from),
                to: parseDateInput(prev.range.to),
            };
            const clamped = clampRangeBounds(parsed);
            const fixed = fixImpossibleRange(clamped);
            const aligned = alignRangeForMode(fixed, mode);
            return {
                mode,
                range: {
                    from: formatDateForEdit(aligned.from),
                    to: formatDateForEdit(aligned.to),
                },
            };
        });
    };

    const fixImpossibleRange = (range: DateRangeValue): DateRangeValue => {
        const normalized = normalizeRangeValue(range);
        const { from, to } = normalized;
        if (from && to && from > to) {
            return { from, to: from };
        }
        return normalized;
    };

    const updateDateRange = (key: keyof DateRangeValue, rawValue: string) => {
        const value = rawValue || undefined;
        setDateDraft((prev) => ({
            mode: 'date-range',
            range: { ...prev.range, [key]: value },
        }));
    };

    const updateSingleDate = (rawValue: string) => {
        const value = rawValue || undefined;
        setDateDraft(() => ({
            mode: 'date',
            range: { from: value, to: value },
        }));
    };

    const handleAddRange = () => setDateMode('date-range');
    const handleRemoveRange = () => setDateMode('date');
    const transformButtonClassName =
        'text-gray-12 shrink-0 !h-4 min-h-0 !w-4 min-w-0 bg-[var(--gray-a3)] hover:bg-[var(--gray-a4)]';
    const handleOptionToggle = (option: string) => {
        if (!onChange || !isOptionsValue) return;
        const isSelected = value.value.includes(option);
        const next = isSelected
            ? value.value.filter((item) => item !== option)
            : [...value.value, option];
        const ordered = value.options.filter((item) => next.includes(item));
        onChange({ ...value, value: ordered });
    };

    const pillBody = (
        <Flex
            align="center"
            gap="1"
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : -1}
            ref={containerRef}
            onPointerDownCapture={handleContainerPointerDown}
            onClick={startEditing}
            onKeyDown={handleContainerKeyDown}
            onBlur={handleBlur}
            className={clsx(
                'group text-gray-12 max-w-full min-w-0 shrink items-center rounded-full bg-[var(--gray-a2)] p-0.5 ring-1 ring-[var(--gray-a6)] transition-colors',
                'focus-within:ring-2 focus-within:ring-[var(--accent-8)] hover:ring-2 hover:ring-[var(--accent-8)] focus-visible:outline-none',
                editable &&
                    'cursor-text focus-within:border-[var(--accent-8)] hover:border-[var(--accent-8)]',
                className
            )}
        >
            {label && (
                <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="truncate pl-1"
                >
                    {label}
                </Text>
            )}

            {isEditing && editable && !isOptionsValue ? (
                isTextValue ? (
                    <InlineInput
                        ref={inputRef}
                        value={textDraft}
                        onChange={(val) => setTextDraft(val)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={placeholder}
                        style={inputPx ? { width: `${inputPx}px` } : undefined}
                        onClick={(event) => event.stopPropagation()}
                        className="min-w-0 font-normal"
                    />
                ) : isDateValue ? (
                    <Flex
                        align="center"
                        gap="1"
                        className="flex-wrap"
                        onClick={(event: ReactMouseEvent<HTMLDivElement>) =>
                            event.stopPropagation()
                        }
                    >
                        <InlineInput
                            ref={dateInputRef}
                            value={dateDraft.range.from ?? ''}
                            onChange={(val) =>
                                isRangeMode
                                    ? updateDateRange('from', val)
                                    : updateSingleDate(val)
                            }
                            onKeyDown={handleInputKeyDown}
                            placeholder={placeholder || editPattern.placeholder}
                            className="min-w-0 font-normal"
                            style={
                                dateWidths.from
                                    ? { width: `${dateWidths.from}px` }
                                    : undefined
                            }
                        />

                        {isRangeMode ? (
                            <>
                                <Text size="1" color="gray">
                                    to
                                </Text>
                                <InlineInput
                                    value={dateDraft.range.to ?? ''}
                                    onChange={(val) =>
                                        updateDateRange('to', val)
                                    }
                                    onKeyDown={handleInputKeyDown}
                                    className="min-w-0 font-normal"
                                    placeholder={
                                        placeholder || editPattern.placeholder
                                    }
                                    style={
                                        dateWidths.to
                                            ? { width: `${dateWidths.to}px` }
                                            : undefined
                                    }
                                />
                                <IconButton
                                    size="0"
                                    variant="ghost"
                                    radius="full"
                                    color="gray"
                                    className={transformButtonClassName}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleRemoveRange();
                                    }}
                                    aria-label="Remove end date"
                                >
                                    <MinusIcon />
                                </IconButton>
                            </>
                        ) : (
                            <IconButton
                                size="0"
                                variant="ghost"
                                radius="full"
                                color="gray"
                                className={transformButtonClassName}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleAddRange();
                                }}
                                aria-label="Add end date"
                            >
                                <PlusIcon />
                            </IconButton>
                        )}
                    </Flex>
                ) : null
            ) : (
                <Text
                    size="1"
                    color={displayValue ? undefined : 'gray'}
                    className="min-w-0 truncate"
                    onPointerDown={startEditing}
                >
                    {displayValue || placeholder}
                </Text>
            )}

            <span
                ref={measureRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 -z-10 text-xs leading-[16px] font-normal whitespace-pre opacity-0"
            >
                {isTextValue ? textDraft || placeholder : placeholder}
            </span>
            {isDateValue && (
                <>
                    <span
                        ref={dateFromMeasureRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0 -z-10 text-xs leading-[16px] font-normal whitespace-pre opacity-0"
                    >
                        {dateDraft.range.from ||
                            placeholder ||
                            editPattern.placeholder}
                    </span>
                    <span
                        ref={dateToMeasureRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0 -z-10 text-xs leading-[16px] font-normal whitespace-pre opacity-0"
                    >
                        {dateDraft.range.to ||
                            placeholder ||
                            editPattern.placeholder}
                    </span>
                </>
            )}

            {onRemove && (
                <IconButton
                    size="1"
                    variant="ghost"
                    radius="full"
                    data-pill-ignore-edit
                    onPointerDownCapture={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                    }}
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

    if (isOptionsValue && editable) {
        return (
            <DropdownMenu.Root
                open={isEditing}
                modal={false}
                onOpenChange={(open) => {
                    if (open) setIsEditing(true);
                }}
            >
                <DropdownMenu.Trigger onPointerDown={startEditing}>
                    {pillBody}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                    size="1"
                    align="start"
                    ref={dropdownContentRef}
                    onPointerDown={(event) => event.stopPropagation()}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                >
                    {value.options.map((option) => {
                        const checked = value.value.includes(option);
                        return (
                            <DropdownMenu.CheckboxItem
                                key={option}
                                checked={checked}
                                onSelect={(event) => event.preventDefault()}
                                onCheckedChange={() =>
                                    handleOptionToggle(option)
                                }
                            >
                                {option}
                            </DropdownMenu.CheckboxItem>
                        );
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        );
    }

    return pillBody;
}
