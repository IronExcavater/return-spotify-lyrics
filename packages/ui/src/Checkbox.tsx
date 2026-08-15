import type { ComponentProps, ReactNode } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import clsx from 'clsx';

type RootProps = Omit<
    ComponentProps<typeof BaseCheckbox.Root>,
    'children' | 'className'
>;

export type CheckboxProps = RootProps & {
    label?: ReactNode;
    description?: ReactNode;
    className?: string;
};

export function Checkbox({
    label,
    description,
    className,
    ...props
}: CheckboxProps) {
    const control = (
        <BaseCheckbox.Root
            {...props}
            className={clsx(
                'group inline-flex size-4.5 shrink-0 items-center justify-center rounded-sm border border-border bg-surface transition outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-50 data-[checked]:border-accent data-[checked]:bg-accent data-[checked]:text-black',
                !label && className
            )}
        >
            <BaseCheckbox.Indicator className="flex items-center justify-center">
                <Check aria-hidden="true" size={13} strokeWidth={3} />
            </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
    );

    if (!label) return control;

    return (
        <label
            className={clsx(
                'flex cursor-pointer items-start gap-2 text-sm',
                className
            )}
        >
            <span className="mt-0.5">{control}</span>
            <span className="min-w-0">
                <span className="block text-text">{label}</span>
                {description && (
                    <span className="mt-0.5 block text-xs text-text-muted">
                        {description}
                    </span>
                )}
            </span>
        </label>
    );
}
