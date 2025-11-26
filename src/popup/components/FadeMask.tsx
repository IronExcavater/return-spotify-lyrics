import { ReactNode } from 'react';

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
    size?: number; // px
    color?: string; // fallback background color
    className?: string;
}

export function FadeMask({
    children,
    fade = 'horizontal',
    size = 32,
    color = 'var(--fade-bg, #000)',
    className,
}: FadeMaskProps) {
    const directions = new Set(
        fade === 'all'
            ? ['left', 'right', 'top', 'bottom']
            : fade === 'horizontal'
              ? ['left', 'right']
              : fade === 'vertical'
                ? ['top', 'bottom']
                : [fade]
    );

    return (
        <div className={`relative overflow-hidden ${className || ''}`}>
            {children}

            {directions.has('left') && (
                <div
                    className="fade-mask left"
                    style={{
                        width: size,
                        background: `linear-gradient(to right, ${color} 0%, transparent 100%)`,
                    }}
                />
            )}

            {directions.has('right') && (
                <div
                    className="fade-mask right"
                    style={{
                        width: size,
                        background: `linear-gradient(to left, ${color} 0%, transparent 100%)`,
                    }}
                />
            )}

            {directions.has('top') && (
                <div
                    className="fade-mask top"
                    style={{
                        height: size,
                        background: `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
                    }}
                />
            )}

            {directions.has('bottom') && (
                <div
                    className="fade-mask bottom"
                    style={{
                        height: size,
                        background: `linear-gradient(to top, ${color} 0%, transparent 100%)`,
                    }}
                />
            )}
        </div>
    );
}
