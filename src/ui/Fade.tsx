import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

export type FadeDirection =
    | 'none'
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'horizontal'
    | 'vertical'
    | 'all';

type FadeSize = number | string;

const directions: Record<FadeDirection, readonly string[]> = {
    none: [],
    left: ['left'],
    right: ['right'],
    top: ['top'],
    bottom: ['bottom'],
    horizontal: ['left', 'right'],
    vertical: ['top', 'bottom'],
    all: ['left', 'right', 'top', 'bottom'],
};

function toCssSize(size: FadeSize) {
    return typeof size === 'number' ? `${size}px` : size;
}

export function createFadeMask(fade: FadeDirection, size: FadeSize) {
    const distance = toCssSize(size);

    const gradients: Record<string, string> = {
        left: `linear-gradient(to right, transparent 0, black ${distance})`,
        right: `linear-gradient(to left, transparent 0, black ${distance})`,
        top: `linear-gradient(to bottom, transparent 0, black ${distance})`,
        bottom: `linear-gradient(to top, transparent 0, black ${distance})`,
    };

    const active = directions[fade];
    if (active.length === 0) return undefined;

    return active.map((direction) => gradients[direction]).join(', ');
}

export type FadeProps = {
    children: ReactNode;
    enabled?: boolean;
    fade?: FadeDirection;
    size?: FadeSize;
    grow?: boolean | number;
    className?: string;
    style?: CSSProperties;
};

export function Fade({
    children,
    enabled = true,
    fade = 'horizontal',
    size = 4,
    grow,
    className,
    style,
}: FadeProps) {
    const maskImage = enabled ? createFadeMask(fade, size) : undefined;

    const maskStyle: CSSProperties | undefined = maskImage
        ? {
              maskImage,
              maskComposite: 'intersect',
              WebkitMaskImage: maskImage,
              WebkitMaskComposite: 'intersect',
          }
        : undefined;

    return (
        <div
            className={clsx(
                'relative min-w-0 overflow-hidden',
                grow === true && 'grow',
                className
            )}
            style={{
                ...maskStyle,
                ...(typeof grow === 'number' ? { flexGrow: grow } : undefined),
                ...style,
            }}
        >
            {children}
        </div>
    );
}
