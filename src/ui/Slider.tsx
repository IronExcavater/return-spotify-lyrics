import type { ComponentProps } from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import clsx from 'clsx';

type BaseSliderProps = Omit<
    ComponentProps<typeof BaseSlider.Root>,
    'children' | 'className'
>;

type SliderProps = BaseSliderProps & {
    label: string;
    className?: string;
};

export function Slider({ label, className, ...props }: SliderProps) {
    return (
        <BaseSlider.Root {...props} className={clsx('w-full', className)}>
            <BaseSlider.Control className="flex h-5 w-full touch-none items-center">
                <BaseSlider.Track className="relative h-1 w-full rounded-full bg-border">
                    <BaseSlider.Indicator className="rounded-full bg-text" />
                    <BaseSlider.Thumb
                        aria-label={label}
                        className="size-3 rounded-full bg-text outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white/70"
                    />
                </BaseSlider.Track>
            </BaseSlider.Control>
        </BaseSlider.Root>
    );
}
