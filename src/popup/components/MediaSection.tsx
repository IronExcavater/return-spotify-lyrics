import {
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    type RefObject,
} from 'react';
import {
    ColumnsIcon,
    Cross2Icon,
    GridIcon,
    RowsIcon,
} from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { Fade } from './Fade';
import { Marquee } from './Marquee';
import { MediaRow } from './MediaRow';
import { MediaShelf, type MediaShelfItem } from './MediaShelf';
import { SegmentedControl } from './SegmentedControl';
import { SkeletonText } from './SkeletonText';
import { StepperControl } from './StepperControl';
import { TextButton } from './TextButton';

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
    cardSize?: 1 | 2 | 3;
    items: MediaShelfItem[];
    hasMore?: boolean;
    loadingMore?: boolean;
    wideColumns?: boolean;
    showImage?: boolean;
    trackSubtitleMode?: 'artist' | 'artist-album' | 'artists';
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
type ControlGroupId = 'type' | 'layout' | 'width' | 'clamp' | 'card';
type ControlGroupProps = {
    id: ControlGroupId;
    label: string;
    activeGroup: ControlGroupId | null;
    groupWidth: number;
    controlsRef: RefObject<HTMLDivElement>;
    labelRef: RefObject<HTMLButtonElement>;
    onToggle: () => void;
    disableTransition?: boolean;
    disabled?: boolean;
    children: ReactNode;
};
function ControlGroup({
    id,
    label,
    activeGroup,
    groupWidth,
    controlsRef,
    labelRef,
    onToggle,
    disableTransition = false,
    disabled = false,
    children,
}: ControlGroupProps) {
    const isActive = activeGroup === id;
    const transitionClass = disableTransition
        ? 'transition-none'
        : 'transition-all ';
    return (
        <div
            className={clsx(
                'relative flex min-w-0 items-center',
                disableTransition ? 'transition-none' : 'transition-[width]'
            )}
            style={{ width: groupWidth || undefined }}
        >
            <div
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none absolute -translate-y-1 opacity-0'
                )}
                ref={controlsRef}
            >
                {children}
            </div>
            <div
                className={clsx(
                    transitionClass,
                    isActive
                        ? 'pointer-events-none absolute translate-y-1 opacity-0'
                        : 'translate-y-0 opacity-100'
                )}
            >
                <TextButton
                    size="2"
                    weight="medium"
                    onClick={onToggle}
                    buttonClassName="py-0.5 px-0.5"
                    disabled={disabled}
                    ref={labelRef}
                >
                    {label}
                </TextButton>
            </div>
        </div>
    );
}
function ControlSeparator() {
    return (
        <Text size="1" color="gray" mx="1">
            |
        </Text>
    );
}
interface Props {
    section: MediaSectionState;
    editing: boolean;
    loading?: boolean;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
    onDelete?: (id: string) => void;
    onReorderItems?: (id: string, next: MediaShelfItem[]) => void;
    onLoadMore?: (id: string) => void;
    onTitleClick?: () => void;
    renderContent?: (context: {
        columnWidth?: number;
        loading: boolean;
    }) => ReactNode;
    headerRight?: ReactNode;
    stickyHeader?: boolean;
    headerFade?: boolean;
    className?: string;
    dragging?: boolean;
    headerLoading?: boolean;
    errorMessage?: string | null;
    onRetry?: () => void;
}
export function MediaSection({
    section,
    editing,
    loading = false,
    onChange,
    onDelete,
    onReorderItems,
    onLoadMore,
    onTitleClick,
    renderContent,
    headerRight,
    stickyHeader = true,
    headerFade = true,
    className,
    dragging = false,
    headerLoading = true,
    errorMessage = null,
    onRetry,
}: Props) {
    const { title, subtitle } = section;
    const [rowsDraft, setRowsDraft] = useState<string | null>(null);
    const [colsDraft, setColsDraft] = useState<string | null>(null);
    const [clampDraft, setClampDraft] = useState<string | null>(null);
    const [widthDraft, setWidthDraft] = useState<string | null>(null);
    const [cardSizeDraft, setCardSizeDraft] = useState<string | null>(null);
    const [activeGroup, setActiveGroup] = useState<ControlGroupId | null>(null);
    const [groupWidths, setGroupWidths] = useState({
        type: 0,
        layout: 0,
        width: 0,
        clamp: 0,
        card: 0,
    });
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
    const sectionRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLDivElement | null>(null);
    const headerHeightRef = useRef(0);
    const measureRowRef = useRef<HTMLDivElement | null>(null);
    const measureStackRef = useRef<HTMLDivElement | null>(null);
    const [rowMetrics, setRowMetrics] = useState<{
        height: number;
        gap: number;
    } | null>(null);
    const prevEditingRef = useRef(editing);
    const [skipEditTransition, setSkipEditTransition] = useState(false);
    const controlGroups = useMemo(
        () =>
            [
                {
                    id: 'type',
                    labelRef: typeLabelRef,
                    controlsRef: typeControlsRef,
                },
                {
                    id: 'layout',
                    labelRef: layoutLabelRef,
                    controlsRef: layoutControlsRef,
                },
                {
                    id: 'width',
                    labelRef: widthLabelRef,
                    controlsRef: widthControlsRef,
                },
                {
                    id: 'clamp',
                    labelRef: clampLabelRef,
                    controlsRef: clampControlsRef,
                },
                {
                    id: 'card',
                    labelRef: cardLabelRef,
                    controlsRef: cardControlsRef,
                },
            ] as const,
        []
    );
    const derivedView = section.view ?? 'list';
    const toggleGroup = (id: ControlGroupId) => {
        setActiveGroup((prev) => (prev === id ? null : id));
    };
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
    // ∞ for h-list/card
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
    const skeletonLabel = '\u00A0';
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
            title: skeletonLabel,
            subtitle: skeletonLabel,
        }));
    }, [
        itemsPerColumn,
        maxVisible,
        orientation,
        isPending,
        section.id,
        skeletonLabel,
    ]);

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

    useLayoutEffect(() => {
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
        const observer = new ResizeObserver(() => compute());
        observer.observe(rowEl);
        observer.observe(stackEl);
        return () => observer.disconnect();
    }, [mode, section.items.length, loading]);

    useLayoutEffect(() => {
        if (!editing) return;
        setActiveGroup('type');
    }, [editing]);

    useLayoutEffect(() => {
        const header = headerRef.current;
        const root = sectionRef.current;
        if (!header || !root) return;
        const update = () => {
            const height = header.getBoundingClientRect().height;
            if (Math.abs(height - headerHeightRef.current) < 0.5) return;
            headerHeightRef.current = height;
            root.style.setProperty(
                '--media-section-header-height',
                `${height}px`
            );
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
        if (!editing) setActiveGroup(null);
    }, [editing]);

    const content = renderContent ? (
        renderContent({ columnWidth, loading: isPending })
    ) : (
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
            cardSize={section.cardSize}
            trackSubtitleMode={section.trackSubtitleMode}
            hasMore={isPending ? false : section.hasMore}
            loadingMore={isPending ? false : section.loadingMore}
            showImage={section.showImage}
            onLoadMore={
                isPending || !onLoadMore
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
            itemLoading={isPending}
        />
    );

    return (
        <div
            className={clsx(
                'rounded-2 bg-background relative ring-2 ring-transparent transition-all',
                'focus-within:z-20',
                editing && 'hover:ring-accent-8! hover:z-20',
                editing && dragging && 'ring-accent-10! z-30',
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
            <Flex direction="column" gap="1" className="relative">
                <div
                    ref={headerRef}
                    className={clsx(
                        'relative overflow-visible',
                        stickyHeader && 'sticky z-20'
                    )}
                    style={
                        stickyHeader
                            ? {
                                  top: 'var(--sticky-top, 0px)',
                              }
                            : undefined
                    }
                >
                    <div className="relative z-10">
                        <Flex
                            direction="row"
                            align="baseline"
                            justify="between"
                            gap="2"
                            className="min-w-0"
                        >
                            <Flex
                                direction="row"
                                align="baseline"
                                gap="2"
                                className="min-w-0"
                            >
                                <SkeletonText
                                    loading={loading && headerLoading}
                                    parts={[title]}
                                    preset="media-row"
                                    variant="title"
                                    className="min-w-0"
                                    fullWidth={false}
                                >
                                    <Fade
                                        enabled={!loading || !headerLoading}
                                        grow
                                    >
                                        <Marquee mode="bounce" grow>
                                            {onTitleClick ? (
                                                <TextButton
                                                    size="3"
                                                    weight="bold"
                                                    onClick={onTitleClick}
                                                >
                                                    {title}
                                                </TextButton>
                                            ) : (
                                                <Text size="3" weight="bold">
                                                    {title}
                                                </Text>
                                            )}
                                        </Marquee>
                                    </Fade>
                                </SkeletonText>
                                {subtitle && (
                                    <SkeletonText
                                        loading={loading && headerLoading}
                                        parts={[subtitle]}
                                        preset="media-row"
                                        variant="subtitle"
                                        className="min-w-0"
                                        fullWidth={false}
                                    >
                                        <Fade
                                            enabled={!loading || !headerLoading}
                                            grow
                                        >
                                            <Marquee mode="left" grow>
                                                <Text size="2" color="gray">
                                                    {subtitle}
                                                </Text>
                                            </Marquee>
                                        </Fade>
                                    </SkeletonText>
                                )}
                            </Flex>
                            {headerRight && (
                                <Flex
                                    align="center"
                                    gap="2"
                                    className="shrink-0"
                                >
                                    {headerRight}
                                </Flex>
                            )}
                        </Flex>
                    </div>
                    <div
                        className={clsx(
                            'pointer-events-none absolute -top-0.5 right-0 z-10 overflow-hidden will-change-[opacity,transform]',
                            skipEditTransition
                                ? 'transition-none'
                                : 'transition-[opacity,transform]',
                            editing ? 'opacity-100' : 'opacity-0'
                        )}
                    >
                        <Flex
                            align="center"
                            direction="row"
                            wrap="nowrap"
                            gap="0.5"
                            p="1"
                            className={clsx(
                                'bg-panel-solid/90 min-h-9 rounded-full shadow-sm backdrop-blur',
                                skipEditTransition
                                    ? 'transition-none'
                                    : 'transition-[opacity,width]',
                                editing
                                    ? 'pointer-events-auto opacity-100'
                                    : 'pointer-events-none opacity-0'
                            )}
                            onMouseDownCapture={(event: ReactMouseEvent) => {
                                const target = event.target;
                                if (target instanceof HTMLInputElement) return;
                                const active = document.activeElement;
                                if (active instanceof HTMLInputElement)
                                    active.blur();
                            }}
                        >
                            <ControlGroup
                                id="type"
                                label="Type"
                                activeGroup={activeGroup}
                                groupWidth={groupWidths.type}
                                controlsRef={typeControlsRef}
                                labelRef={typeLabelRef}
                                onToggle={() => toggleGroup('type')}
                                disableTransition={skipEditTransition}
                                disabled={!editing}
                            >
                                <Flex align="center" direction="row" gap="1">
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
                                                view:
                                                    viewNext === 'card'
                                                        ? 'card'
                                                        : 'list',
                                                infinite:
                                                    viewNext === 'card'
                                                        ? 'columns'
                                                        : viewNext === 'h-list'
                                                          ? 'columns'
                                                          : null,
                                                columns:
                                                    viewNext === 'v-list'
                                                        ? 1
                                                        : viewNext === 'card'
                                                          ? 0
                                                          : 0,
                                                rows:
                                                    viewNext === 'v-list'
                                                        ? 0
                                                        : LIMITS_BY_MODE[
                                                              viewNext
                                                          ].rows.min,
                                            })
                                        }
                                        disabled={!editing}
                                    />
                                </Flex>
                            </ControlGroup>
                            <ControlSeparator />
                            <ControlGroup
                                id="layout"
                                label="Layout"
                                activeGroup={activeGroup}
                                groupWidth={groupWidths.layout}
                                controlsRef={layoutControlsRef}
                                labelRef={layoutLabelRef}
                                onToggle={() => toggleGroup('layout')}
                                disableTransition={skipEditTransition}
                                disabled={!editing}
                            >
                                <Flex
                                    align="center"
                                    direction="row"
                                    wrap="nowrap"
                                    gap="2"
                                >
                                    <StepperControl
                                        label="Rows"
                                        value={rowsDraft ?? displayRowsStr}
                                        placeholder={defaultRowsPlaceholder}
                                        onDecrement={() => {
                                            setRowsDraft(null);
                                            const next =
                                                rowLimits.allowInfinite &&
                                                layoutRows === rowLimits.min
                                                    ? 0
                                                    : clampCount(
                                                          (layoutRows || 0) - 1,
                                                          rowLimits
                                                      );
                                            onChange(section.id, {
                                                rows: next,
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
                                                (value) =>
                                                    clampCount(
                                                        value,
                                                        rowLimits
                                                    ),
                                                setRowsDraft,
                                                'rows'
                                            )
                                        }
                                        onValueBlur={() =>
                                            blurCount(
                                                rowsDraft,
                                                (value) =>
                                                    clampCount(
                                                        value,
                                                        rowLimits
                                                    ),
                                                defaultRowsByMode,
                                                setRowsDraft,
                                                'rows'
                                            )
                                        }
                                        onValueFocus={() =>
                                            focusDraft(
                                                displayRowsStr,
                                                setRowsDraft
                                            )
                                        }
                                        disabled={!editing}
                                    />
                                    {mode !== 'v-list' && (
                                        <StepperControl
                                            label="Cols"
                                            value={colsDraft ?? displayColsStr}
                                            placeholder={defaultColsPlaceholder}
                                            onDecrement={() => {
                                                setColsDraft(null);
                                                const next =
                                                    colLimits.allowInfinite &&
                                                    layoutCols === colLimits.min
                                                        ? 0
                                                        : clampCount(
                                                              (layoutCols ||
                                                                  0) - 1,
                                                              colLimits
                                                          );
                                                onChange(section.id, {
                                                    columns: next,
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
                                                        clampCount(
                                                            value,
                                                            colLimits
                                                        ),
                                                    setColsDraft,
                                                    'columns'
                                                )
                                            }
                                            onValueBlur={() =>
                                                blurCount(
                                                    colsDraft,
                                                    (value) =>
                                                        clampCount(
                                                            value,
                                                            colLimits
                                                        ),
                                                    defaultColsByMode,
                                                    setColsDraft,
                                                    'columns'
                                                )
                                            }
                                            onValueFocus={() =>
                                                focusDraft(
                                                    displayColsStr,
                                                    setColsDraft
                                                )
                                            }
                                            disabled={!editing}
                                        />
                                    )}
                                </Flex>
                            </ControlGroup>
                            {mode === 'h-list' && (
                                <>
                                    <ControlSeparator />
                                    <ControlGroup
                                        id="width"
                                        label="Width"
                                        activeGroup={activeGroup}
                                        groupWidth={groupWidths.width}
                                        controlsRef={widthControlsRef}
                                        labelRef={widthLabelRef}
                                        onToggle={() => toggleGroup('width')}
                                        disableTransition={skipEditTransition}
                                        disabled={!editing}
                                    >
                                        <StepperControl
                                            label="Width"
                                            value={
                                                widthDraft ?? displayWidthStr
                                            }
                                            placeholder={String(
                                                defaultColumnWidth
                                            )}
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
                                                        : clampColumnWidth(
                                                              parsed
                                                          );
                                                onChange(section.id, {
                                                    columnWidth: next,
                                                });
                                            }}
                                            onValueBlur={() => {
                                                if (widthDraft === null) return;
                                                const parsed =
                                                    parseClamp(widthDraft);
                                                const next =
                                                    parsed === null ||
                                                    parsed === undefined
                                                        ? defaultColumnWidth
                                                        : clampColumnWidth(
                                                              parsed
                                                          );
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
                                                    className="px-px"
                                                >
                                                    px
                                                </Text>
                                            }
                                            disabled={!editing}
                                        />
                                    </ControlGroup>
                                </>
                            )}
                            {mode === 'v-list' && (
                                <>
                                    <ControlSeparator />
                                    <ControlGroup
                                        id="clamp"
                                        label="Clamp"
                                        activeGroup={activeGroup}
                                        groupWidth={groupWidths.clamp}
                                        controlsRef={clampControlsRef}
                                        labelRef={clampLabelRef}
                                        onToggle={() => toggleGroup('clamp')}
                                        disableTransition={skipEditTransition}
                                        disabled={!editing}
                                    >
                                        <StepperControl
                                            label="Clamp"
                                            value={
                                                clampDraft ?? displayClampStr
                                            }
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
                                                          ? clampClampRows(
                                                                parsed
                                                            )
                                                          : clampClampPx(
                                                                parsed
                                                            );
                                                onChange(section.id, {
                                                    rowHeight: value,
                                                    clampUnit,
                                                });
                                            }}
                                            onValueBlur={() => {
                                                if (clampDraft === null) return;
                                                const parsed =
                                                    parseClamp(clampDraft);
                                                const value =
                                                    parsed === undefined
                                                        ? undefined
                                                        : parsed === null
                                                          ? undefined
                                                          : clampUnit ===
                                                              'items'
                                                            ? clampClampRows(
                                                                  parsed
                                                              )
                                                            : clampClampPx(
                                                                  parsed
                                                              );
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
                                                <DropdownMenu.Root
                                                    modal={false}
                                                >
                                                    <DropdownMenu.Trigger
                                                        onKeyDown={
                                                            handleMenuTriggerKeyDown
                                                        }
                                                    >
                                                        <Button
                                                            size="0"
                                                            variant="ghost"
                                                            radius="small"
                                                            className="px-px!"
                                                            disabled={!editing}
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
                                                                updateClampUnit(
                                                                    'px'
                                                                )
                                                            }
                                                        >
                                                            pixels
                                                        </DropdownMenu.Item>
                                                        <DropdownMenu.Item
                                                            onSelect={() =>
                                                                updateClampUnit(
                                                                    'items'
                                                                )
                                                            }
                                                        >
                                                            rows
                                                        </DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Root>
                                            }
                                            disabled={!editing}
                                        />
                                    </ControlGroup>
                                </>
                            )}
                            {mode === 'card' && (
                                <>
                                    <ControlSeparator />
                                    <ControlGroup
                                        id="card"
                                        label="Card"
                                        activeGroup={activeGroup}
                                        groupWidth={groupWidths.card}
                                        controlsRef={cardControlsRef}
                                        labelRef={cardLabelRef}
                                        onToggle={() => toggleGroup('card')}
                                        disableTransition={skipEditTransition}
                                        disabled={!editing}
                                    >
                                        <StepperControl
                                            label="Size"
                                            value={
                                                cardSizeDraft ??
                                                displayCardSizeStr
                                            }
                                            placeholder="2"
                                            onDecrement={() => {
                                                setCardSizeDraft(null);
                                                const next = Math.max(
                                                    1,
                                                    cardSize - 1
                                                ) as 1 | 2 | 3;
                                                onChange(section.id, {
                                                    cardSize: next,
                                                });
                                            }}
                                            onIncrement={() => {
                                                setCardSizeDraft(null);
                                                const next = Math.min(
                                                    3,
                                                    cardSize + 1
                                                ) as 1 | 2 | 3;
                                                onChange(section.id, {
                                                    cardSize: next,
                                                });
                                            }}
                                            onValueChange={changeCardSize}
                                            onValueBlur={() =>
                                                blurCardSize(cardSizeDraft)
                                            }
                                            onValueFocus={() =>
                                                focusDraft(
                                                    displayCardSizeStr,
                                                    setCardSizeDraft
                                                )
                                            }
                                            disabled={!editing}
                                        />
                                    </ControlGroup>
                                </>
                            )}
                            {onDelete && (
                                <>
                                    <IconButton
                                        size="1"
                                        variant="ghost"
                                        radius="full"
                                        color="red"
                                        disabled={!editing}
                                        onClick={() => onDelete(section.id)}
                                        aria-label={`Remove ${title}`}
                                    >
                                        <Cross2Icon />
                                    </IconButton>
                                </>
                            )}
                        </Flex>
                    </div>
                    {stickyHeader && headerFade && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 z-0"
                            style={{ top: 0, height: '100%' }}
                        >
                            <div
                                className="absolute inset-0"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(to bottom, var(--color-background) 0%, var(--color-background) 40%, transparent 100%)',
                                }}
                            />
                            <div
                                className="absolute inset-0"
                                style={{
                                    backgroundColor: 'rgba(0,0,0,0.001)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    WebkitMaskImage:
                                        'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0) 100%)',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskSize: '100% 100%',
                                    WebkitMaskPosition: 'top',
                                    maskImage:
                                        'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0) 100%)',
                                    maskRepeat: 'no-repeat',
                                    maskSize: '100% 100%',
                                    maskPosition: 'top',
                                }}
                            />
                        </div>
                    )}
                </div>
                <div className="relative">
                    <div
                        className={clsx(
                            'relative',
                            editing && 'pointer-events-none select-none'
                        )}
                    >
                        {content}
                    </div>
                    <div
                        className={clsx(
                            'absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200',
                            showError
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0'
                        )}
                        aria-hidden={!showError}
                    >
                        <div
                            className={clsx(
                                'rounded-2 bg-panel-solid/85 text-1 text-gray-12 flex max-w-65 flex-col items-center gap-2 px-4 py-3 text-center shadow-sm backdrop-blur transition-[opacity,transform] duration-200',
                                showError
                                    ? 'translate-y-0 opacity-100'
                                    : '-translate-y-1 opacity-0'
                            )}
                        >
                            <Text size="1" color="gray">
                                {errorMessage ?? 'Failed to load this section.'}
                            </Text>
                            {onRetry && (
                                <Button
                                    size="1"
                                    variant="soft"
                                    onClick={onRetry}
                                    disabled={!showError}
                                >
                                    Reload
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {!loading && section.loadingMore && (
                    <div className="pointer-events-none absolute right-2 bottom-2 z-20">
                        <Flex
                            align="center"
                            gap="1"
                            className="bg-panel-solid/90 text-1 text-gray-12 rounded-full px-2 py-1.5 shadow-sm backdrop-blur"
                        >
                            <span className="bg-accent-9 h-2 w-2 animate-pulse rounded-full" />
                            Loading more
                        </Flex>
                    </div>
                )}
            </Flex>
        </div>
    );
}
