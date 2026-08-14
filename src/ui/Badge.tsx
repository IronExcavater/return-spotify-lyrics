import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'accent' | 'danger' | 'muted';

export type BadgeProps = {
    children?: ReactNode;
    content?: ReactNode;
    dot?: boolean;
    tone?: BadgeTone;
    className?: string;
};

const toneClass: Record<BadgeTone, string> = {
    accent: 'bg-accent text-black',
    danger: 'bg-danger text-white',
    muted: 'bg-surface-raised text-text',
};

export function Badge({
    children,
    content,
    dot = false,
    tone = 'accent',
    className,
}: BadgeProps) {
    const indicator = (
        <span
            data-badge="true"
            aria-hidden={dot || content == null ? true : undefined}
            className={clsx(
                'inline-flex shrink-0 items-center justify-center rounded-full leading-none font-semibold',
                dot ? 'size-2.5' : 'min-w-4 px-1 py-0.5 text-[10px]',
                toneClass[tone],
                children && 'absolute -top-1 -right-1 z-10',
                className
            )}
        >
            {!dot && content}
        </span>
    );

    if (!children) return indicator;

    return (
        <span className="relative inline-flex min-w-0 shrink-0">
            {children}
            {indicator}
        </span>
    );
}
