export const resolveLocale = (locale?: string) => {
    const trimmed = locale?.trim();
    if (!trimmed || trimmed === 'system') {
        if (typeof navigator !== 'undefined' && navigator.language) {
            return navigator.language;
        }
        return 'en';
    }
    return trimmed;
};

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
