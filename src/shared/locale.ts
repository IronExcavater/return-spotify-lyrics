import type { Market } from '@spotify/web-api-ts-sdk';

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

export const resolveMarket = (locale?: string): Market => {
    const resolved = resolveLocale(locale);
    const region = resolved.split('-')[1];
    return (region || 'US') as Market;
};
