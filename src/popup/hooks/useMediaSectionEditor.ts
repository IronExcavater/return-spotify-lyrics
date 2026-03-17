import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { MediaSectionState } from '../types/mediaSection';

const CLAMP_PX_MAX = 720;
const COLUMN_WIDTH_MIN = 180;
const COLUMN_WIDTH_MAX = 520;
export const LIMITS_BY_MODE = {
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

export const clampCount = (
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

export type ControlGroupId = 'type' | 'layout' | 'width' | 'clamp' | 'card';

type EditorOptions = {
    section: MediaSectionState;
    editing: boolean;
    loading: boolean;
    errorMessage: string | null;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
};

export type MediaSectionEditor = ReturnType<typeof useMediaSectionEditor>;

export function useMediaSectionEditor({
    section,
    editing,
    loading,
    errorMessage,
    onChange,
}: EditorOptions) {
    const [rowsDraft, setRowsDraft] = useState<string | null>(null);
    const [colsDraft, setColsDraft] = useState<string | null>(null);
    const [clampDraft, setClampDraft] = useState<string | null>(null);
    const [widthDraft, setWidthDraft] = useState<string | null>(null);
    const [cardSizeDraft, setCardSizeDraft] = useState<string | null>(null);
    const [activeGroup, setActiveGroup] = useState<ControlGroupId | null>(null);
    const [groupWidths, setGroupWidths] = useState<
        Record<ControlGroupId, number>
    >({
        type: 0,
        layout: 0,
        width: 0,
        clamp: 0,
        card: 0,
    });
    const [rowMetrics, setRowMetrics] = useState<{
        height: number;
        gap: number;
    } | null>(null);
    const [skipEditTransition, setSkipEditTransition] = useState(false);

    const typeLabelRef = useRef<HTMLButtonElement | null>(null);
    const typeControlsRef = useRef<HTMLDivElement | null>(null);
    const layoutLabelRef = useRef<HTMLButtonElement | null>(null);
    const layoutControlsRef = useRef<HTMLDivElement | null>(null);
    const widthLabelRef = useRef<HTMLButtonElement | null>(null);
    const widthControlsRef = useRef<HTMLDivElement | null>(null);
    const clampLabelRef = useRef<HTMLButtonElement | null>(null);
    const clampControlsRef = useRef<HTMLDivElement | null>(null);
    const cardLabelRef = useRef<HTMLButtonElement | null>(null);
    const cardControlsRef = useRef<HTMLDivElement | null>(null);
    const measureRowRef = useRef<HTMLDivElement | null>(null);
    const measureStackRef = useRef<HTMLDivElement | null>(null);
    const prevEditingRef = useRef(editing);

    const controlGroups = useMemo(
        () => [
            {
                id: 'type' as const,
                labelRef: typeLabelRef,
                controlsRef: typeControlsRef,
            },
            {
                id: 'layout' as const,
                labelRef: layoutLabelRef,
                controlsRef: layoutControlsRef,
            },
            {
                id: 'width' as const,
                labelRef: widthLabelRef,
                controlsRef: widthControlsRef,
            },
            {
                id: 'clamp' as const,
                labelRef: clampLabelRef,
                controlsRef: clampControlsRef,
            },
            {
                id: 'card' as const,
                labelRef: cardLabelRef,
                controlsRef: cardControlsRef,
            },
        ],
        []
    );

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
    const defaultColsByMode = mode === 'v-list' ? 1 : 0;
    const defaultRowsByMode =
        mode === 'v-list' ? 0 : LIMITS_BY_MODE[mode].rows.min;
    const defaultColsPlaceholder =
        defaultColsByMode === 0 ? '∞' : String(defaultColsByMode);
    const defaultRowsPlaceholder =
        defaultRowsByMode === 0 ? '∞' : String(defaultRowsByMode);
    const orientation: 'horizontal' | 'vertical' =
        mode === 'v-list' ? 'vertical' : 'horizontal';
    const variant: 'list' | 'tile' = mode === 'card' ? 'tile' : 'list';
    const rowLimits = LIMITS_BY_MODE[mode].rows;
    const colLimits = LIMITS_BY_MODE[mode].cols;
    const rawCols = section.columns;
    const rawRows = section.rows;
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
    const cardSize = Math.min(3, Math.max(1, section.cardSize ?? 2)) as
        | 1
        | 2
        | 3;
    const displayCardSizeStr = String(cardSize);

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

    const changeCardSize = (value: string) => {
        setCardSizeDraft(value);
        const parsed = parseCount(value, (next) =>
            Math.min(3, Math.max(1, next))
        );
        if (parsed === null) return;
        onChange(section.id, { cardSize: parsed as 1 | 2 | 3 });
    };

    const blurCardSize = (draft: string | null) => {
        if (draft === null) return;
        const parsed = parseCount(draft, (next) =>
            Math.min(3, Math.max(1, next))
        );
        const next =
            parsed === null ? (section.cardSize ?? 2) : (parsed as 1 | 2 | 3);
        onChange(section.id, { cardSize: next });
        setCardSizeDraft(null);
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
    const clampRowsMax =
        rowHeightPx !== undefined && rowGapPx !== undefined
            ? Math.max(
                  minClampRows,
                  Math.floor(
                      (CLAMP_PX_MAX + rowGapPx) / (rowHeightPx + rowGapPx)
                  )
              )
            : minClampRows;
    const clampClampRows = (val: number) =>
        Math.min(clampRowsMax, Math.max(minClampRows, val));
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
    const showError = Boolean(errorMessage);
    const isPending = loading || showError;
    const placeholderItems = useMemo(() => {
        if (!isPending) return [];
        const cols = maxVisible ?? (orientation === 'horizontal' ? 4 : 8);
        const rows = itemsPerColumn ?? 3;
        const count = orientation === 'horizontal' ? cols * rows : cols;
        const safeCount = Math.max(6, Math.min(count, 48));
        return Array.from({ length: safeCount }).map((_, idx) => ({
            id: `${section.id}-placeholder-${idx}`,
            title: '\u00A0',
            subtitle: '\u00A0',
        }));
    }, [isPending, itemsPerColumn, maxVisible, orientation, section.id]);
    const shelfItems =
        isPending && section.items.length === 0
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
        onChange(section.id, { clampUnit: nextUnit, rowHeight: converted });
        setClampDraft(String(converted));
    };

    const toggleGroup = (id: ControlGroupId) => {
        setActiveGroup((prev) => (prev === id ? null : id));
    };

    useEffect(() => {
        if (mode !== 'v-list') return;
        const rowEl = measureRowRef.current;
        const stackEl = measureStackRef.current;
        if (!rowEl || !stackEl) return;
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
        const observer = new ResizeObserver(compute);
        observer.observe(rowEl);
        observer.observe(stackEl);
        return () => observer.disconnect();
    }, [loading, mode, section.items.length]);

    useEffect(() => {
        if (editing && !prevEditingRef.current) {
            setSkipEditTransition(true);
            const raf = requestAnimationFrame(() => {
                setSkipEditTransition(false);
            });
            prevEditingRef.current = editing;
            return () => cancelAnimationFrame(raf);
        }
        if (!editing) setSkipEditTransition(false);
        prevEditingRef.current = editing;
    }, [editing]);

    useLayoutEffect(() => {
        if (!editing) return;
        const update = () => {
            setGroupWidths((prev) => {
                const next = { ...prev };
                controlGroups.forEach((group) => {
                    const width =
                        activeGroup === group.id
                            ? group.controlsRef.current?.offsetWidth
                            : group.labelRef.current?.offsetWidth;
                    if (width !== undefined) next[group.id] = width;
                });
                return next;
            });
        };
        update();
        const observer = new ResizeObserver(update);
        controlGroups.forEach((group) => {
            if (group.labelRef.current)
                observer.observe(group.labelRef.current);
            if (group.controlsRef.current)
                observer.observe(group.controlsRef.current);
        });
        return () => observer.disconnect();
    }, [activeGroup, controlGroups, editing, mode]);

    useEffect(() => {
        if (!editing) setActiveGroup(null);
    }, [editing]);

    return {
        activeGroup,
        blurCardSize,
        blurCount,
        cardLabelRef,
        cardControlsRef,
        cardSize,
        cardSizeDraft,
        changeCardSize,
        clampClampPx,
        clampClampRows,
        clampDraft,
        clampLabelRef,
        clampControlsRef,
        clampUnit,
        clampUnitLabel,
        colLimits,
        colsDraft,
        controlGroups,
        defaultColsByMode,
        defaultColsPlaceholder,
        defaultColumnWidth,
        defaultRowsByMode,
        defaultRowsPlaceholder,
        displayCardSizeStr,
        displayClampStr,
        displayColsStr,
        displayRowsStr,
        displayWidthStr,
        fixedHeight,
        focusDraft,
        groupWidths,
        isPending,
        itemsPerColumn,
        layoutCols,
        layoutRows,
        layoutLabelRef,
        layoutControlsRef,
        maxVisible,
        measureRowRef,
        measureStackRef,
        mode,
        onEditControlsMouseDownCapture: (target: EventTarget | null) => {
            if (target instanceof HTMLInputElement) return;
            const active = document.activeElement;
            if (active instanceof HTMLInputElement) active.blur();
        },
        orientation,
        parseClamp,
        rowLimits,
        rowsDraft,
        setCardSizeDraft,
        setClampDraft,
        setColsDraft,
        setRowsDraft,
        setWidthDraft,
        shelfItems,
        skipEditTransition,
        toggleGroup,
        typeLabelRef,
        typeControlsRef,
        updateClampUnit,
        variant,
        widthControlsRef,
        widthDraft,
        widthLabelRef,
        changeCount,
        columnWidth,
        clampColumnWidth,
    };
}
