export const LOCALE_OPTIONS = [
    { label: 'System', locale: 'system' },
    { label: 'United States', locale: 'en-US' },
    { label: 'United Kingdom', locale: 'en-GB' },
    { label: 'Australia', locale: 'en-AU' },
    { label: 'Canada', locale: 'en-CA' },
    { label: 'Ireland', locale: 'en-IE' },
    { label: 'New Zealand', locale: 'en-NZ' },
    { label: 'South Africa', locale: 'en-ZA' },
    { label: 'France', locale: 'fr-FR' },
    { label: 'Germany', locale: 'de-DE' },
    { label: 'Italy', locale: 'it-IT' },
    { label: 'Spain', locale: 'es-ES' },
    { label: 'Portugal', locale: 'pt-PT' },
    { label: 'Brazil', locale: 'pt-BR' },
    { label: 'Netherlands', locale: 'nl-NL' },
    { label: 'Sweden', locale: 'sv-SE' },
    { label: 'Norway', locale: 'nb-NO' },
    { label: 'Denmark', locale: 'da-DK' },
    { label: 'Finland', locale: 'fi-FI' },
    { label: 'Poland', locale: 'pl-PL' },
    { label: 'Czech Republic', locale: 'cs-CZ' },
    { label: 'Hungary', locale: 'hu-HU' },
    { label: 'Romania', locale: 'ro-RO' },
    { label: 'Greece', locale: 'el-GR' },
    { label: 'Turkey', locale: 'tr-TR' },
    { label: 'Russia', locale: 'ru-RU' },
    { label: 'Ukraine', locale: 'uk-UA' },
    { label: 'Israel', locale: 'he-IL' },
    { label: 'Saudi Arabia', locale: 'ar-SA' },
    { label: 'India', locale: 'hi-IN' },
    { label: 'Thailand', locale: 'th-TH' },
    { label: 'Vietnam', locale: 'vi-VN' },
    { label: 'Indonesia', locale: 'id-ID' },
    { label: 'Malaysia', locale: 'ms-MY' },
    { label: 'Japan', locale: 'ja-JP' },
    { label: 'South Korea', locale: 'ko-KR' },
    { label: 'China', locale: 'zh-CN' },
    { label: 'Taiwan', locale: 'zh-TW' },
] as const;

export type LocaleOption = (typeof LOCALE_OPTIONS)[number];

export const DEFAULT_LOCALE_OPTION = LOCALE_OPTIONS[0];

export const findLocaleOption = (locale?: string) =>
    LOCALE_OPTIONS.find((option) => option.locale === locale) ??
    DEFAULT_LOCALE_OPTION;

export const filterLocaleOptions = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return LOCALE_OPTIONS;

    return LOCALE_OPTIONS.filter(
        (option) =>
            option.label.toLowerCase().includes(normalizedQuery) ||
            option.locale.toLowerCase().includes(normalizedQuery)
    );
};
