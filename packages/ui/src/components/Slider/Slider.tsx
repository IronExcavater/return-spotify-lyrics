import type { CSSProperties, ReactNode } from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import clsx from 'clsx';
import Text from '../Text/Text';
import { toPercent } from './percent';

type SharedProps = Omit<
    BaseSlider.Root.Props,
    'className' | 'style' | 'children' | 'render'
> & {
    /** Values that get a mark on the track, like the chapters of an episode. */
    marks?: readonly number[];
    /** The text that a screen reader hears for a value, like `1:12 of 3:45` for a seek bar. */
    formatValue?: ((value: number) => string) | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

type LabelledProps = {
    /** A name above the slider. */
    label: ReactNode;
    /** A name for each thumb of a range, like `Lowest` and `Highest`. */
    thumbLabels?: readonly string[] | undefined;
};

// A slider with no visible name needs a name for each thumb, like "Volume".
type UnlabelledProps = {
    label?: undefined;
    thumbLabels: readonly string[];
};

export type SliderProps = SharedProps & (LabelledProps | UnlabelledProps);

/**
 * A track with one thumb, or two for a range, that a person drags or moves with the arrow keys, on Base UI's
 * `Slider`. It works across or up, like the seek bar of the lyric creator.
 */
export default function Slider({
    label,
    thumbLabels,
    marks = [],
    formatValue,
    min = 0,
    max = 100,
    orientation = 'horizontal',
    className,
    ...props
}: SliderProps) {
    const value = props.value ?? props.defaultValue ?? min;
    const thumbCount = Array.isArray(value) ? value.length : 1;

    return (
        <BaseSlider.Root
            {...props}
            min={min}
            max={max}
            orientation={orientation}
            className={clsx('slider', className)}
        >
            {label !== undefined && (
                <BaseSlider.Label data-part="label">
                    <Text inline>{label}</Text>
                </BaseSlider.Label>
            )}
            <BaseSlider.Control data-part="control">
                <BaseSlider.Track data-part="track">
                    <BaseSlider.Indicator data-part="indicator" />
                    {marks.map((mark) => (
                        <span
                            key={mark}
                            data-part="mark"
                            aria-hidden
                            style={{
                                '--slider-mark': `${toPercent(mark, min, max)}%`,
                            }}
                        />
                    ))}
                    {Array.from({ length: thumbCount }, (_, index) => (
                        <BaseSlider.Thumb
                            key={index}
                            index={index}
                            aria-label={thumbLabels?.[index]}
                            getAriaValueText={
                                formatValue &&
                                ((_text, thumbValue) => formatValue(thumbValue))
                            }
                            data-part="thumb"
                        />
                    ))}
                </BaseSlider.Track>
            </BaseSlider.Control>
        </BaseSlider.Root>
    );
}
