declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number | undefined;
    }
}

export type CssLength = number | string;

export function toCssSize(size: CssLength): string {
    return typeof size === 'number' ? `${size}px` : size;
}
