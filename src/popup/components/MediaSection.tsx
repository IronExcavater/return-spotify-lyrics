import { useState } from 'react';
import { GridIcon, RowsIcon, ColumnsIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { InlineInput } from './InlineInput';
import { MediaShelf, type MediaShelfItem } from './MediaShelf';
import { SegmentedControl } from './SegmentedControl';

export type MediaSectionVariant = 'list' | 'tile';
export type MediaSectionOrientation = 'vertical' | 'horizontal';

export type MediaSectionState = {
    id: string;
    title: string;
    subtitle?: string;
    view?: 'card' | 'list';
    columns?: number;
    rows?: number;
    infinite?: 'columns' | 'rows' | null;
    rowHeight?: number;
    clampUnit?: 'px' | 'items';
    items: MediaShelfItem[];
    // legacy fields
    variant?: 'list' | 'tile';
    orientation?: 'vertical' | 'horizontal';
    maxVisible?: number;
    itemsPerColumn?: number;
    fixedHeight?: number;
    hasMore?: boolean;
    loadingMore?: boolean;
};

const MAX_ROWS = 12;
const MAX_COLS = 12;

const clampRows = (val: number) => {
    if (Number.isNaN(val)) return Number.NaN;
    if (val <= 0) return 0;
    return Math.min(MAX_ROWS, val);
};

const clampCols = (val: number) => {
    if (Number.isNaN(val)) return Number.NaN;
    if (val <= 0) return 0;
    return Math.min(MAX_COLS, val);
};

type StepperControlProps = {
    label: string;
    value: string | number;
    placeholder: string;
    onDecrement: () => void;
    onIncrement: () => void;
    onValueChange: (val: string) => void;
    onValueBlur: () => void;
    onValueFocus: () => void;
};

function StepperControl({
    label,
    value,
    placeholder,
    onDecrement,
    onIncrement,
    onValueChange,
    onValueBlur,
    onValueFocus,
}: StepperControlProps) {
    return (
        <Flex align="center" gap="1">
            <Text size="1" color="gray">
                {label}
            </Text>
            <Button
                size="0"
                variant="ghost"
                radius="small"
                onClick={onDecrement}
            >
                –
            </Button>
            <InlineInput
                value={value}
                placeholder={placeholder}
                usePlaceholderWidth
                onChange={onValueChange}
                onBlur={onValueBlur}
                onFocus={onValueFocus}
                className="text-center"
            />
            <Button
                size="0"
                variant="ghost"
                radius="small"
                onClick={onIncrement}
            >
                +
            </Button>
        </Flex>
    );
}

interface Props {
    section: MediaSectionState;
    editing: boolean;
    preview?: boolean;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
    onRemove?: (id: string) => void;
    onDelete?: (id: string) => void;
    onReorderItems?: (id: string, next: MediaShelfItem[]) => void;
    onLoadMore?: (id: string) => void;
    className?: string;
    dragging?: boolean;
}

export function MediaSection({
    section,
    editing,
    preview = false,
    onChange,
    onRemove,
    onDelete,
    onReorderItems,
    onLoadMore,
    className,
    dragging = false,
}: Props) {
    const { title, subtitle } = section;
    const [rowsDraft, setRowsDraft] = useState<string | null>(null);
    const [colsDraft, setColsDraft] = useState<string | null>(null);
    const [clampDraft, setClampDraft] = useState<string | null>(null);

    const derivedView =
        section.view ??
        (section.variant === 'tile'
            ? 'card'
            : section.variant === 'list'
              ? 'list'
              : 'list');

    const derivedInfinite =
        section.infinite !== undefined
            ? section.infinite
            : derivedView === 'card'
              ? 'columns'
              : section.orientation === 'horizontal'
                ? 'columns'
                : null;

    const mode: 'card' | 'h-list' | 'v-list' =
        derivedView === 'card'
            ? 'card'
            : derivedInfinite === 'columns'
              ? 'h-list'
              : 'v-list';

    const defaultColsByMode = mode === 'v-list' ? 1 : 0; // ∞ for h-list/card
    const defaultRowsByMode = mode === 'v-list' ? 0 : mode === 'h-list' ? 3 : 1;
    const defaultColsPlaceholder =
        defaultColsByMode === 0 ? '∞' : String(defaultColsByMode);
    const defaultRowsPlaceholder =
        defaultRowsByMode === 0 ? '∞' : String(defaultRowsByMode);

    const orientation = mode === 'v-list' ? 'vertical' : 'horizontal';
    const variant = mode === 'card' ? 'tile' : 'list';

    const rawCols = section.columns;
    const rawRows = section.rows;
    const colsFromLegacy = Number.isFinite(section.maxVisible)
        ? Number(section.maxVisible)
        : undefined;
    const rowsFromLegacy = Number.isFinite(section.itemsPerColumn)
        ? Number(section.itemsPerColumn)
        : undefined;

    const layoutCols = clampCols(
        Number.isFinite(Number(rawCols))
            ? Number(rawCols)
            : (colsFromLegacy ?? defaultColsByMode)
    );
    const layoutRows = clampRows(
        Number.isFinite(Number(rawRows))
            ? Number(rawRows)
            : (rowsFromLegacy ?? defaultRowsByMode)
    );

    const isColsBlank = typeof rawCols === 'number' && Number.isNaN(rawCols);
    const isRowsBlank = typeof rawRows === 'number' && Number.isNaN(rawRows);
    const displayCols = isColsBlank ? '' : layoutCols === 0 ? '∞' : layoutCols;
    const displayRows = isRowsBlank ? '' : layoutRows === 0 ? '∞' : layoutRows;
    const displayClamp =
        typeof section.rowHeight === 'number' && Number.isNaN(section.rowHeight)
            ? ''
            : section.rowHeight === undefined
              ? '∞'
              : section.rowHeight;
    const displayColsStr = String(displayCols);
    const displayRowsStr = String(displayRows);
    const displayClampStr = String(displayClamp);

    const parseCount = (raw: string, clamp: (val: number) => number) => {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (trimmed === '∞' || trimmed === '0') return 0;
        const next = Number(trimmed);
        if (!Number.isFinite(next)) return null;
        return clamp(next);
    };

    const parseClamp = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (trimmed === '∞' || trimmed === '0') return undefined;
        const next = Number(trimmed);
        if (!Number.isFinite(next) || next <= 0) return null;
        return next;
    };

    const focusDraft = (
        display: string,
        setDraft: (value: string | null) => void
    ) => {
        setDraft(display === '∞' ? '' : display);
    };

    const changeCount = (
        value: string,
        clamp: (val: number) => number,
        setDraft: (value: string | null) => void,
        key: 'rows' | 'columns'
    ) => {
        setDraft(value);
        const parsed = parseCount(value, clamp);
        if (parsed === null) return;
        onChange(section.id, { [key]: parsed });
    };

    const blurCount = (
        draft: string | null,
        clamp: (val: number) => number,
        fallback: number,
        setDraft: (value: string | null) => void,
        key: 'rows' | 'columns'
    ) => {
        if (draft === null) return;
        const parsed = parseCount(draft, clamp);
        onChange(section.id, {
            [key]: parsed === null ? clamp(fallback) : parsed,
        });
        setDraft(null);
    };

    const itemsPerColumn =
        orientation === 'horizontal' ? Math.max(1, layoutRows || 1) : 1;
    const maxVisible =
        orientation === 'horizontal'
            ? layoutCols === 0
                ? undefined
                : layoutCols
            : layoutRows === 0
              ? undefined
              : layoutRows;
    const clampValue =
        section.rowHeight === undefined || Number.isNaN(section.rowHeight)
            ? undefined
            : Number.isFinite(Number(section.rowHeight))
              ? Number(section.rowHeight)
              : undefined;
    const clampPx =
        orientation === 'vertical' && clampValue ? clampValue : undefined;

    const fixedHeight = orientation === 'vertical' ? clampPx : undefined;

    const content = (
        <MediaShelf
            droppableId={`media-shelf-${section.id}`}
            items={section.items as MediaShelfItem[]}
            variant={variant === 'tile' ? 'tile' : 'list'}
            orientation={orientation}
            itemsPerColumn={itemsPerColumn}
            maxVisible={maxVisible}
            fixedHeight={fixedHeight}
            className={variant === 'list' ? 'pr-1' : undefined}
            hasMore={preview ? false : section.hasMore}
            loadingMore={preview ? false : section.loadingMore}
            onLoadMore={
                preview || !onLoadMore
                    ? undefined
                    : () => onLoadMore(section.id)
            }
            onReorder={
                onReorderItems
                    ? (next) => onReorderItems(section.id, next)
                    : undefined
            }
            interactive={!editing}
            draggable={false}
            itemLoading={preview}
        />
    );

    return (
        <div
            className={clsx(
                'rounded-2 relative m-1 min-w-0 bg-[var(--color-background)] ring-2 ring-transparent ring-offset-3 ring-offset-[var(--color-background)] transition-all',
                editing && 'hover:!ring-[var(--accent-8)]',
                editing && dragging && '!ring-[var(--accent-10)]',
                className
            )}
            data-dragging={dragging ? 'true' : 'false'}
        >
            <Flex direction="column" gap="1" className="relative min-w-0">
                <Flex
                    direction="row"
                    align="baseline"
                    gap="2"
                    className="min-w-0"
                >
                    <Text size="3" weight="bold">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text size="2" color="gray">
                            {subtitle}
                        </Text>
                    )}
                </Flex>

                <div
                    className={clsx(
                        'pointer-events-none absolute top-0 right-1 z-10 overflow-hidden transition-[opacity,transform] duration-300 will-change-[opacity,transform]',
                        editing ? 'opacity-100' : 'max-h-0 opacity-0'
                    )}
                >
                    <Flex
                        align="center"
                        gap="1"
                        className={clsx(
                            'pointer-events-auto rounded-full bg-[var(--color-panel-solid)]/90 p-1 text-[12px] shadow-sm backdrop-blur transition-opacity',
                            editing ? 'opacity-100' : 'opacity-0'
                        )}
                        onMouseDownCapture={(event) => {
                            const target = event.target;
                            if (target instanceof HTMLInputElement) return;
                            const active = document.activeElement;
                            if (active instanceof HTMLInputElement)
                                active.blur();
                        }}
                    >
                        <SegmentedControl
                            items={[
                                {
                                    key: 'v-list',
                                    label: 'Vertical list',
                                    icon: <RowsIcon />,
                                },
                                {
                                    key: 'h-list',
                                    label: 'Horizontal list',
                                    icon: <ColumnsIcon />,
                                },
                                {
                                    key: 'card',
                                    label: 'Card',
                                    icon: <GridIcon />,
                                },
                            ]}
                            active={mode}
                            orientation="horizontal"
                            onSelect={(viewNext) =>
                                onChange(section.id, {
                                    view: viewNext === 'card' ? 'card' : 'list',
                                    infinite:
                                        viewNext === 'card'
                                            ? 'columns'
                                            : viewNext === 'h-list'
                                              ? 'columns'
                                              : null,
                                    orientation:
                                        viewNext === 'v-list'
                                            ? 'vertical'
                                            : 'horizontal',
                                })
                            }
                        />

                        <Flex align="center" gap="2">
                            {/* TODO: Why is this blurring the input when the value changes instead of keeping it focused */}
                            <StepperControl
                                label="Rows"
                                value={rowsDraft ?? displayRowsStr}
                                placeholder={defaultRowsPlaceholder}
                                onDecrement={() => {
                                    setRowsDraft(null);
                                    onChange(section.id, {
                                        rows: clampRows((layoutRows || 0) - 1),
                                    });
                                }}
                                onIncrement={() => {
                                    setRowsDraft(null);
                                    onChange(section.id, {
                                        rows: clampRows(
                                            layoutRows === 0
                                                ? 1
                                                : layoutRows + 1
                                        ),
                                    });
                                }}
                                onValueChange={(val) =>
                                    changeCount(
                                        val,
                                        clampRows,
                                        setRowsDraft,
                                        'rows'
                                    )
                                }
                                onValueBlur={() =>
                                    blurCount(
                                        rowsDraft,
                                        clampRows,
                                        defaultRowsByMode,
                                        setRowsDraft,
                                        'rows'
                                    )
                                }
                                onValueFocus={() =>
                                    focusDraft(displayRowsStr, setRowsDraft)
                                }
                            />

                            {mode !== 'v-list' && (
                                /* TODO: Why is this blurring the input when the value changes instead of keeping it focused */
                                <StepperControl
                                    label="Cols"
                                    value={colsDraft ?? displayColsStr}
                                    placeholder={defaultColsPlaceholder}
                                    onDecrement={() => {
                                        setColsDraft(null);
                                        onChange(section.id, {
                                            columns: clampCols(
                                                (layoutCols || 0) - 1
                                            ),
                                        });
                                    }}
                                    onIncrement={() => {
                                        setColsDraft(null);
                                        onChange(section.id, {
                                            columns: clampCols(
                                                layoutCols === 0
                                                    ? 1
                                                    : layoutCols + 1
                                            ),
                                        });
                                    }}
                                    onValueChange={(val) =>
                                        changeCount(
                                            val,
                                            clampCols,
                                            setColsDraft,
                                            'columns'
                                        )
                                    }
                                    onValueBlur={() =>
                                        blurCount(
                                            colsDraft,
                                            clampCols,
                                            defaultColsByMode,
                                            setColsDraft,
                                            'columns'
                                        )
                                    }
                                    onValueFocus={() =>
                                        focusDraft(displayColsStr, setColsDraft)
                                    }
                                />
                            )}
                        </Flex>

                        {mode === 'v-list' && (
                            <Flex align="center" gap="1" ml="2">
                                <Text size="1" color="gray">
                                    Clamp
                                </Text>
                                <InlineInput
                                    value={clampDraft ?? displayClampStr}
                                    placeholder="∞"
                                    usePlaceholderWidth
                                    onChange={(val) => {
                                        setClampDraft(val);
                                        const parsed = parseClamp(val);
                                        if (parsed === null) return;
                                        onChange(section.id, {
                                            rowHeight: parsed ?? undefined,
                                            clampUnit: 'px',
                                        });
                                    }}
                                    onBlur={() => {
                                        if (clampDraft === null) return;
                                        const parsed = parseClamp(clampDraft);
                                        onChange(section.id, {
                                            rowHeight: parsed ?? undefined,
                                            clampUnit: 'px',
                                        });
                                        setClampDraft(null);
                                    }}
                                    onFocus={() => {
                                        setClampDraft(
                                            displayClampStr === '∞'
                                                ? ''
                                                : displayClampStr
                                        );
                                    }}
                                    className="text-center"
                                />
                                <Text size="1" color="gray">
                                    px
                                </Text>
                            </Flex>
                        )}

                        <IconButton
                            size="1"
                            variant="ghost"
                            color="red"
                            radius="full"
                            aria-label="Hide section"
                            onClick={() => {
                                if (onDelete) onDelete(section.id);
                                else onRemove?.(section.id);
                            }}
                        >
                            ✕
                        </IconButton>
                    </Flex>
                </div>

                <div
                    className={clsx(
                        editing && 'pointer-events-none select-none'
                    )}
                >
                    {content}
                </div>
            </Flex>
        </div>
    );
}
