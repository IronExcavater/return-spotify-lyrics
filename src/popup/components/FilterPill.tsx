import { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
    children: ReactNode;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function FilterPill({
    children,
    selected = false,
    onClick,
    className,
}: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                'inline-flex min-w-0 items-center gap-2 rounded-full border px-2 py-1 text-[12px] transition-colors',
                selected
                    ? 'border-[var(--accent-a7)] bg-[var(--accent-a4)]/50 text-white'
                    : 'border-[var(--gray-a5)] bg-[var(--color-panel-solid)] text-[var(--gray-12)] hover:border-[var(--gray-a7)] hover:bg-[var(--gray-a4)]/40',
                'focus-visible:ring-2 focus-visible:ring-[var(--accent-8)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-panel-solid)] focus-visible:outline-none',
                className
            )}
        >
            {children}
        </button>
    );
}
