export type PlatformKind = 'apple' | 'windows' | 'linux' | 'other';

const resolvePlatform = (): string => {
    if (typeof navigator === 'undefined') return '';
    const nav = navigator as Navigator & {
        userAgentData?: { platform?: string };
    };
    const raw =
        nav.userAgentData?.platform ?? (nav.platform || nav.userAgent || '');
    return String(raw).toLowerCase();
};

export const getPlatformKind = (): PlatformKind => {
    const platform = resolvePlatform();
    if (
        platform.includes('mac') ||
        platform.includes('iphone') ||
        platform.includes('ipad') ||
        platform.includes('ipod') ||
        platform.includes('ios')
    ) {
        return 'apple';
    }
    if (platform.includes('win')) return 'windows';
    if (
        platform.includes('linux') ||
        platform.includes('x11') ||
        platform.includes('android')
    ) {
        return 'linux';
    }
    return 'other';
};

export const getPrimaryModifierLabel = () =>
    getPlatformKind() === 'apple' ? '⌘' : 'Ctrl';
