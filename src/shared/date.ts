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

export const formatIsoDate = (
    iso?: string,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
    locale?: string
) => {
    if (!iso) return undefined;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const formatter = new Intl.DateTimeFormat(resolveLocale(locale), options);
    return formatter.format(date);
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
