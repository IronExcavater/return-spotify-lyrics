import { ReactNode } from 'react';
import clsx from 'clsx';

interface FadeMaskProps {
    children: ReactNode;
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
    className?: string;
}

export function Fade({
    children,
    fade = 'horizontal',
    size = 24,
    className,
}: FadeMaskProps) {
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
        DIRECTIONS[fade]?.map((dir) => GRADIENTS[dir]).join(',') || undefined;

    return (
        <div
            className={clsx('relative', className)}
            style={{
                maskImage,
                maskComposite: 'intersect',
                WebkitMaskImage: maskImage,
                WebkitMaskComposite: 'intersect',
            }}
        >
            {children}
        </div>
    );
}
