import { resolveLocale } from './locale';

export const formatDateWithFormatter = (
    iso: string | undefined,
    formatter: Intl.DateTimeFormat
) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return formatter.format(date);
};

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getDateFormatter = (
    locale: string | undefined,
    options: Intl.DateTimeFormatOptions
) => {
    const resolvedLocale = resolveLocale(locale);
    const key = `${resolvedLocale}|${JSON.stringify(options)}`;
    let formatter = dateFormatterCache.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(resolvedLocale, options);
        dateFormatterCache.set(key, formatter);
    }
    return formatter;
};

export const formatIsoDate = (
    iso?: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
    locale?: string
) => {
    if (!iso) return undefined;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return getDateFormatter(locale, options).format(date);
};

export const formatDurationShort = (ms?: number) => {
    if (!ms) return undefined;
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(
            seconds
        ).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const formatDurationLong = (ms?: number) => {
    if (!ms) return undefined;
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
};
