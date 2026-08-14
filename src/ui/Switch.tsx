import type { ComponentProps, ReactNode } from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import clsx from 'clsx';

type RootProps = Omit<
    ComponentProps<typeof BaseSwitch.Root>,
    'children' | 'className'
>;

export type SwitchProps = RootProps & {
    label?: ReactNode;
    description?: ReactNode;
    className?: string;
};

export function Switch({
    label,
    description,
    className,
    ...props
}: SwitchProps) {
    const control = (
        <BaseSwitch.Root
            {...props}
            className={clsx(
                'group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border bg-surface-raised transition outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50 data-[checked]:border-accent data-[checked]:bg-accent',
                !label && className
            )}
        >
            <BaseSwitch.Thumb className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-text shadow-sm transition-transform group-data-[checked]:translate-x-4 group-data-[checked]:bg-black" />
        </BaseSwitch.Root>
    );

    if (!label) return control;

    return (
        <label
            className={clsx(
                'flex cursor-pointer items-center justify-between gap-3 text-sm',
                className
            )}
        >
            <span className="min-w-0">
                <span className="block text-text">{label}</span>
                {description && (
                    <span className="mt-0.5 block text-xs text-text-muted">
                        {description}
                    </span>
                )}
            </span>
            {control}
        </label>
    );
}
