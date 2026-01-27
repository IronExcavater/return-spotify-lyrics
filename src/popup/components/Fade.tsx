import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
    children: ReactNode;
    enabled?: boolean;
    fade?:
        | 'none'
        | 'left'
        | 'right'
        | 'top'
        | 'bottom'
        | 'horizontal'
        | 'vertical'
        | 'all';
    size?: number;
    grow?: boolean | number;
    className?: string;
    style?: CSSProperties;
}

export function Fade({
    children,
    enabled = true,
    fade = 'horizontal',
    size = 4,
    grow,
    className,
    style,
}: Props) {
    const DIRECTIONS: Record<string, string[]> = {
        none: [],
        left: ['left'],
        right: ['right'],
        top: ['top'],
        bottom: ['bottom'],
        horizontal: ['left', 'right'],
        vertical: ['top', 'bottom'],
        all: ['left', 'right', 'top', 'bottom'],
    };

    const GRADIENTS: Record<string, string> = {
        left: `linear-gradient(to right, transparent, black ${size}px)`,
        right: `linear-gradient(to left, transparent, black ${size}px)`,
        top: `linear-gradient(to bottom, transparent, black ${size}px)`,
        bottom: `linear-gradient(to top, transparent, black ${size}px)`,
    };

    const maskImage =
        enabled && fade !== 'none'
            ? DIRECTIONS[fade]?.map((dir) => GRADIENTS[dir]).join(',')
            : undefined;

    const maskStyles =
        maskImage === undefined
            ? undefined
            : {
                  maskImage,
                  maskComposite: 'intersect',
                  WebkitMaskImage: maskImage,
                  WebkitMaskComposite: 'intersect',
              };
    const growClass = grow === true ? 'grow' : undefined;
    const growStyle = typeof grow === 'number' ? { flexGrow: grow } : undefined;

    return (
        <div
            className={clsx(
                'relative min-w-0 overflow-hidden',
                growClass,
                className
            )}
            style={{ ...maskStyles, ...growStyle, ...style }}
        >
            {children}
        </div>
    );
}
