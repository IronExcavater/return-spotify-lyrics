import { formatDateWithFormatter } from '../../../shared/date';
import type { PillValue } from '../../../shared/types';

export type DateRangeValue = Extract<
    PillValue,
    { type: 'date-range' }
>['value'];
export type DateLikeValue = Extract<PillValue, { type: 'date' | 'date-range' }>;
export type DateDraft = {
    mode: 'date' | 'date-range';
    range: DateRangeValue;
};
export type DateGranularity = 'day' | 'month' | 'year';
export type DateOrder = Array<'day' | 'month' | 'year'>;

const EARLIEST_MUSIC_YEAR = 1900;
const todayIso = new Date().toISOString().slice(0, 10);
const minDateIso = `${EARLIEST_MUSIC_YEAR}-01-01`;

export function formatDateRangeValue(
    range: DateRangeValue,
    formatter: Intl.DateTimeFormat
) {
    const from = formatDateWithFormatter(range.from, formatter);
    const to = formatDateWithFormatter(range.to, formatter);
    if (from && to) return `${from} to ${to}`;
    return from || to;
}

export function isDateLikeValue(value: PillValue): value is DateLikeValue {
    return value.type === 'date' || value.type === 'date-range';
}

export function resolveEditPattern(formatter: Intl.DateTimeFormat) {
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
}

export function normalizeRangeValue(range: DateRangeValue): DateRangeValue {
    return {
        from: range.from || undefined,
        to: range.to || undefined,
    };
}

export function clampDateToBounds(iso?: string): string | undefined {
    if (!iso) return undefined;
    const parsed = Date.parse(iso);
    if (Number.isNaN(parsed)) return undefined;
    const clamped = Math.max(
        Date.parse(minDateIso),
        Math.min(Date.parse(todayIso), parsed)
    );
    return new Date(clamped).toISOString().slice(0, 10);
}

export function clampRangeBounds(range: DateRangeValue): DateRangeValue {
    return {
        from: clampDateToBounds(range.from),
        to: clampDateToBounds(range.to),
    };
}

export function alignRangeForMode(
    range: DateRangeValue,
    mode: DateDraft['mode']
): DateRangeValue {
    const normalized = normalizeRangeValue(range);
    if (mode === 'date') {
        const value = normalized.from ?? normalized.to;
        return value ? { from: value, to: value } : {};
    }
    return normalized;
}

export function rangeToDateString(range: DateRangeValue) {
    return range.from ?? range.to ?? '';
}

export function getDateFormatOptions(
    granularity: DateGranularity,
    mode: 'display' | 'edit'
) {
    if (granularity === 'year') {
        return { year: 'numeric' } satisfies Intl.DateTimeFormatOptions;
    }

    if (granularity === 'month') {
        return mode === 'edit'
            ? ({
                  month: '2-digit',
                  year: 'numeric',
              } satisfies Intl.DateTimeFormatOptions)
            : ({
                  month: 'short',
                  year: 'numeric',
              } satisfies Intl.DateTimeFormatOptions);
    }

    return mode === 'edit'
        ? ({
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          } satisfies Intl.DateTimeFormatOptions)
        : ({
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          } satisfies Intl.DateTimeFormatOptions);
}

export function buildDateDraft(
    value: DateLikeValue,
    formatDateForEdit: (iso?: string) => string | undefined
): DateDraft {
    if (value.type === 'date') {
        const formatted = formatDateForEdit(value.value);
        return {
            mode: 'date',
            range: { from: formatted, to: formatted },
        };
    }

    return {
        mode: 'date-range',
        range: {
            from: formatDateForEdit(value.value.from),
            to: formatDateForEdit(value.value.to),
        },
    };
}

export function fixImpossibleRange(range: DateRangeValue): DateRangeValue {
    const normalized = normalizeRangeValue(range);
    const { from, to } = normalized;

    if (from && to && from > to) {
        return { from, to: from };
    }

    return normalized;
}
