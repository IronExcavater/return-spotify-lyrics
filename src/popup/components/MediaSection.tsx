import {
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    MouseEvent as ReactMouseEvent,
} from 'react';
import { GridIcon, RowsIcon, ColumnsIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';

import { MediaRow } from './MediaRow';
import { MediaShelf, type MediaShelfItem } from './MediaShelf';
import { SegmentedControl } from './SegmentedControl';
import { StepperControl } from './StepperControl';

export type MediaSectionState = {
    id: string;
    title: string;
    subtitle?: string;
    view?: 'card' | 'list';
    columns?: number;
    rows?: number;
    infinite?: 'columns' | 'rows' | null;
    rowHeight?: number;
    columnWidth?: number;
    clampUnit?: 'px' | 'items';
    items: MediaShelfItem[];
    hasMore?: boolean;
    loadingMore?: boolean;
    wideColumns?: boolean;
};

const CLAMP_PX_MAX = 720;
const COLUMN_WIDTH_MIN = 180;
const COLUMN_WIDTH_MAX = 520;
const LIMITS_BY_MODE = {
    'v-list': {
        rows: { min: 5, max: 20, allowInfinite: true },
        cols: { min: 1, max: 1, allowInfinite: false },
    },
    'h-list': {
        rows: { min: 5, max: 20, allowInfinite: true },
        cols: { min: 2, max: 20, allowInfinite: true },
    },
    card: {
        rows: { min: 1, max: 5, allowInfinite: false },
        cols: { min: 5, max: 20, allowInfinite: true },
    },
} as const;

const clampCount = (
    val: number,
    {
        min,
        max,
        allowInfinite,
    }: { min: number; max: number; allowInfinite: boolean }
) => {
    if (Number.isNaN(val)) return Number.NaN;
    if (val <= 0) return allowInfinite ? 0 : min;
    return Math.min(max, Math.max(min, val));
};

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
    const [widthDraft, setWidthDraft] = useState<string | null>(null);
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const measureRowRef = useRef<HTMLDivElement | null>(null);
    const measureStackRef = useRef<HTMLDivElement | null>(null);
    const [rowMetrics, setRowMetrics] = useState<{
        height: number;
        gap: number;
    } | null>(null);

    const derivedView = section.view ?? 'list';

    const derivedInfinite =
        section.infinite !== undefined
            ? section.infinite
            : derivedView === 'card'
              ? 'columns'
              : null;

    const mode: 'card' | 'h-list' | 'v-list' =
        derivedView === 'card'
            ? 'card'
            : derivedInfinite === 'columns'
              ? 'h-list'
              : 'v-list';

    const defaultColsByMode = mode === 'v-list' ? 1 : 0; // ∞ for h-list/card
    const defaultRowsByMode =
        mode === 'v-list' ? 0 : LIMITS_BY_MODE[mode].rows.min;
    const defaultColsPlaceholder =
        defaultColsByMode === 0 ? '∞' : String(defaultColsByMode);
    const defaultRowsPlaceholder =
        defaultRowsByMode === 0 ? '∞' : String(defaultRowsByMode);

    const orientation = mode === 'v-list' ? 'vertical' : 'horizontal';
    const variant = mode === 'card' ? 'tile' : 'list';

    const rawCols = section.columns;
    const rawRows = section.rows;

    const rowLimits = LIMITS_BY_MODE[mode].rows;
    const colLimits = LIMITS_BY_MODE[mode].cols;

    const layoutCols = clampCount(
        Number.isFinite(Number(rawCols)) ? Number(rawCols) : defaultColsByMode,
        colLimits
    );
    const layoutRows = clampCount(
        Number.isFinite(Number(rawRows)) ? Number(rawRows) : defaultRowsByMode,
        rowLimits
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
    const defaultColumnWidth = 300;
    const columnWidth =
        mode === 'h-list'
            ? clampCount(
                  Number.isFinite(Number(section.columnWidth))
                      ? Number(section.columnWidth)
                      : defaultColumnWidth,
                  {
                      min: COLUMN_WIDTH_MIN,
                      max: COLUMN_WIDTH_MAX,
                      allowInfinite: false,
                  }
              )
            : undefined;
    const displayWidthStr =
        columnWidth === undefined ? '' : String(columnWidth);

    const parseCount = (
        raw: string,
        clamp: (val: number) => number
    ): number | null => {
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
    const clampUnit = section.clampUnit ?? 'px';
    const clampValue =
        section.rowHeight === undefined || Number.isNaN(section.rowHeight)
            ? undefined
            : Number.isFinite(Number(section.rowHeight))
              ? Number(section.rowHeight)
              : undefined;
    const rowHeightPx = rowMetrics?.height;
    const rowGapPx = rowMetrics?.gap;
    const minClampRows = 3;
    const clampRowsMin = minClampRows;
    const clampRowsMax =
        rowHeightPx !== undefined && rowGapPx !== undefined
            ? Math.max(
                  clampRowsMin,
                  Math.floor(
                      (CLAMP_PX_MAX + rowGapPx) / (rowHeightPx + rowGapPx)
                  )
              )
            : clampRowsMin;
    const clampClampRows = (val: number) =>
        Math.min(clampRowsMax, Math.max(clampRowsMin, val));
    const rowsToPx =
        rowHeightPx !== undefined && rowGapPx !== undefined
            ? (rows: number) =>
                  rows * rowHeightPx + Math.max(0, rows - 1) * rowGapPx
            : null;
    const pxToRows =
        rowHeightPx !== undefined && rowGapPx !== undefined
            ? (px: number) => (px + rowGapPx) / (rowHeightPx + rowGapPx)
            : null;
    const minClampPx = rowsToPx ? rowsToPx(minClampRows) : undefined;
    const clampClampPx = (val: number) =>
        minClampPx === undefined
            ? val
            : Math.min(CLAMP_PX_MAX, Math.max(minClampPx, val));
    const clampPx =
        orientation === 'vertical' && clampValue && rowsToPx
            ? clampUnit === 'items'
                ? Math.ceil(rowsToPx(clampClampRows(clampValue))) + 1
                : clampClampPx(clampValue)
            : undefined;

    const fixedHeight = orientation === 'vertical' ? clampPx : undefined;

    const clampUnitLabel = clampUnit === 'items' ? 'rows' : 'px';
    const clampColumnWidth = (val: number) =>
        Math.min(COLUMN_WIDTH_MAX, Math.max(COLUMN_WIDTH_MIN, val));

    const placeholderItems = useMemo(() => {
        if (!preview) return [];
        const cols = maxVisible ?? (orientation === 'horizontal' ? 4 : 8);
        const rows = itemsPerColumn ?? 3;
        const count = orientation === 'horizontal' ? cols * rows : cols;
        const safeCount = Math.max(6, Math.min(count, 48));
        return Array.from({ length: safeCount }).map((_, idx) => ({
            id: `${section.id}-placeholder-${idx}`,
            title: 'Loading',
            subtitle: 'Loading',
        }));
    }, [itemsPerColumn, maxVisible, orientation, preview, section.id]);

    const shelfItems =
        preview && section.items.length === 0
            ? placeholderItems
            : section.items;

    const toRows = pxToRows ? (px: number) => Math.round(pxToRows(px)) : null;
    const toPx = rowsToPx ? (rows: number) => Math.round(rowsToPx(rows)) : null;

    const updateClampUnit = (nextUnit: 'px' | 'items') => {
        if (nextUnit === clampUnit) return;
        if (!toRows || !toPx) return;
        const raw =
            clampDraft ??
            (clampValue === undefined ? undefined : String(clampValue));

        if (raw === undefined) {
            onChange(section.id, { clampUnit: nextUnit });
            return;
        }

        const parsed = parseClamp(raw);
        if (parsed === null) {
            onChange(section.id, { clampUnit: nextUnit });
            setClampDraft(null);
            return;
        }

        if (parsed === undefined) {
            onChange(section.id, { clampUnit: nextUnit, rowHeight: undefined });
            setClampDraft(null);
            return;
        }

        const converted =
            clampUnit === 'px' && nextUnit === 'items'
                ? clampClampRows(toRows(parsed))
                : clampUnit === 'items' && nextUnit === 'px'
                  ? clampClampPx(toPx(parsed))
                  : parsed;

        onChange(section.id, {
            clampUnit: nextUnit,
            rowHeight: converted,
        });
        setClampDraft(String(converted));
    };

    useLayoutEffect(() => {
        if (mode !== 'v-list') return;
        const rowEl = measureRowRef.current;
        const stackEl = measureStackRef.current;
        if (!rowEl) return;
        if (!stackEl) return;

        const compute = () => {
            const rect = rowEl.getBoundingClientRect();
            const style = getComputedStyle(stackEl);
            const rawGap = style.rowGap || style.gap || '0';
            const parsedGap = Number.parseFloat(rawGap);
            const gap = Number.isFinite(parsedGap) ? parsedGap : 0;
            const height = rect.height;
            if (!height) return;
            setRowMetrics((prev) => {
                if (!prev || prev.height !== height || prev.gap !== gap) {
                    return { height, gap };
                }
                return prev;
            });
        };

        compute();
        const observer = new ResizeObserver(() => compute());
        observer.observe(rowEl);
        observer.observe(stackEl);
        return () => observer.disconnect();
    }, [mode, section.items.length, preview]);

    const content = (
        <MediaShelf
            droppableId={`media-shelf-${section.id}`}
            items={shelfItems as MediaShelfItem[]}
            variant={variant === 'tile' ? 'tile' : 'list'}
            orientation={orientation}
            itemsPerColumn={itemsPerColumn}
            wideColumns={section.wideColumns}
            columnWidth={columnWidth}
            maxVisible={maxVisible}
            fixedHeight={fixedHeight}
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
            ref={sectionRef}
        >
            <div className="pointer-events-none absolute -z-10 opacity-0">
                <Flex
                    ref={measureStackRef}
                    direction="column"
                    gap="1"
                    style={{ width: 320 }}
                >
                    <div ref={measureRowRef}>
                        <MediaRow
                            title="Measure row"
                            subtitle="Measure subtitle"
                        />
                    </div>
                </Flex>
            </div>
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
                        'pointer-events-none absolute -top-0.5 right-0 z-10 overflow-hidden transition-[opacity,transform] duration-300 will-change-[opacity,transform]',
                        editing ? 'opacity-100' : 'max-h-0 opacity-0'
                    )}
                >
                    <Flex
                        align="center"
                        gap="1"
                        className={clsx(
                            'pointer-events-auto rounded-full bg-[var(--color-panel-solid)]/90 p-1 shadow-sm backdrop-blur transition-opacity',
                            editing ? 'opacity-100' : 'opacity-0'
                        )}
                        onMouseDownCapture={(event: ReactMouseEvent) => {
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
                                })
                            }
                        />

                        <Flex align="center" gap="2">
                            <StepperControl
                                label="Rows"
                                value={rowsDraft ?? displayRowsStr}
                                placeholder={defaultRowsPlaceholder}
                                onDecrement={() => {
                                    setRowsDraft(null);
                                    onChange(section.id, {
                                        rows: clampCount(
                                            (layoutRows || 0) - 1,
                                            rowLimits
                                        ),
                                    });
                                }}
                                onIncrement={() => {
                                    setRowsDraft(null);
                                    onChange(section.id, {
                                        rows: clampCount(
                                            layoutRows === 0
                                                ? 1
                                                : layoutRows + 1,
                                            rowLimits
                                        ),
                                    });
                                }}
                                onValueChange={(val) =>
                                    changeCount(
                                        val,
                                        (value) => clampCount(value, rowLimits),
                                        setRowsDraft,
                                        'rows'
                                    )
                                }
                                onValueBlur={() =>
                                    blurCount(
                                        rowsDraft,
                                        (value) => clampCount(value, rowLimits),
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
                                <StepperControl
                                    label="Cols"
                                    value={colsDraft ?? displayColsStr}
                                    placeholder={defaultColsPlaceholder}
                                    onDecrement={() => {
                                        setColsDraft(null);
                                        onChange(section.id, {
                                            columns: clampCount(
                                                (layoutCols || 0) - 1,
                                                colLimits
                                            ),
                                        });
                                    }}
                                    onIncrement={() => {
                                        setColsDraft(null);
                                        onChange(section.id, {
                                            columns: clampCount(
                                                layoutCols === 0
                                                    ? 1
                                                    : layoutCols + 1,
                                                colLimits
                                            ),
                                        });
                                    }}
                                    onValueChange={(val) =>
                                        changeCount(
                                            val,
                                            (value) =>
                                                clampCount(value, colLimits),
                                            setColsDraft,
                                            'columns'
                                        )
                                    }
                                    onValueBlur={() =>
                                        blurCount(
                                            colsDraft,
                                            (value) =>
                                                clampCount(value, colLimits),
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

                            {mode === 'h-list' && (
                                <StepperControl
                                    label="Width"
                                    value={widthDraft ?? displayWidthStr}
                                    placeholder={String(defaultColumnWidth)}
                                    hideSteppers
                                    onDecrement={() => undefined}
                                    onIncrement={() => undefined}
                                    onValueChange={(val) => {
                                        setWidthDraft(val);
                                        const parsed = parseClamp(val);
                                        if (parsed === null) return;
                                        const next =
                                            parsed === undefined
                                                ? defaultColumnWidth
                                                : clampColumnWidth(parsed);
                                        onChange(section.id, {
                                            columnWidth: next,
                                        });
                                    }}
                                    onValueBlur={() => {
                                        if (widthDraft === null) return;
                                        const parsed = parseClamp(widthDraft);
                                        const next =
                                            parsed === null ||
                                            parsed === undefined
                                                ? defaultColumnWidth
                                                : clampColumnWidth(parsed);
                                        onChange(section.id, {
                                            columnWidth: next,
                                        });
                                        setWidthDraft(null);
                                    }}
                                    onValueFocus={() =>
                                        focusDraft(
                                            displayWidthStr,
                                            setWidthDraft
                                        )
                                    }
                                    suffix={
                                        <Text
                                            size="1"
                                            color="gray"
                                            className="px-0.25"
                                        >
                                            px
                                        </Text>
                                    }
                                />
                            )}
                        </Flex>

                        {mode === 'v-list' && (
                            <StepperControl
                                label="Clamp"
                                value={clampDraft ?? displayClampStr}
                                placeholder="∞"
                                hideSteppers
                                onDecrement={() => undefined}
                                onIncrement={() => undefined}
                                onValueChange={(val) => {
                                    setClampDraft(val);
                                    const parsed = parseClamp(val);
                                    if (parsed === null) return;
                                    const value =
                                        parsed === undefined
                                            ? undefined
                                            : clampUnit === 'items'
                                              ? clampClampRows(parsed)
                                              : clampClampPx(parsed);
                                    onChange(section.id, {
                                        rowHeight: value,
                                        clampUnit,
                                    });
                                }}
                                onValueBlur={() => {
                                    if (clampDraft === null) return;
                                    const parsed = parseClamp(clampDraft);
                                    const value =
                                        parsed === undefined
                                            ? undefined
                                            : parsed === null
                                              ? undefined
                                              : clampUnit === 'items'
                                                ? clampClampRows(parsed)
                                                : clampClampPx(parsed);
                                    onChange(section.id, {
                                        rowHeight: value,
                                        clampUnit,
                                    });
                                    setClampDraft(null);
                                }}
                                onValueFocus={() => {
                                    setClampDraft(
                                        displayClampStr === '∞'
                                            ? ''
                                            : displayClampStr
                                    );
                                }}
                                suffix={
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <Button
                                                size="0"
                                                variant="ghost"
                                                radius="small"
                                                className="!px-0.25"
                                            >
                                                {clampUnitLabel}
                                            </Button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content
                                            align="end"
                                            size="1"
                                        >
                                            <DropdownMenu.Item
                                                onSelect={() =>
                                                    updateClampUnit('px')
                                                }
                                            >
                                                pixels
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Item
                                                onSelect={() =>
                                                    updateClampUnit('items')
                                                }
                                            >
                                                rows
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                }
                            />
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
                {!preview && section.loadingMore && (
                    <div className="pointer-events-none absolute right-2 bottom-2 z-20">
                        <Flex
                            align="center"
                            gap="1"
                            className="rounded-full bg-[var(--color-panel-solid)]/90 px-2 py-[6px] text-[11px] text-[var(--gray-12)] shadow-sm backdrop-blur"
                        >
                            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-9)]" />
                            Loading more
                        </Flex>
                    </div>
                )}
            </Flex>
        </div>
    );
}
