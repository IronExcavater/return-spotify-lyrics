declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number | undefined;
    }
}

export type CssLength = number | string;

export function toCssSize(size: CssLength): string {
    return typeof size === 'number' ? `${size}px` : size;
}

/** A CSS time, like `200ms` or `0.3s`, in milliseconds. */
export function toMilliseconds(time: string): number {
    const value = parseFloat(time);
    if (!Number.isFinite(value)) return 0;
    return time.trim().endsWith('ms') ? value : value * 1000;
}
