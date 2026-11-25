import {
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import clsx from 'clsx';
import useLabelFallback from '../../hooks/useLabelFallback';
import Text from '../Text/Text';

export type SegmentedOption<Value extends string> = {
    value: Value;
    /** The text of the segment. Without it, give the segment an `aria-label`. */
    label?: ReactNode;
    /** An icon before the text, or in place of it. */
    icon?: ReactNode;
    'aria-label'?: string | undefined;
};

export type SegmentedControlProps<Value extends string = string> = Omit<
    ToggleGroup.Props,
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'multiple'
    | 'orientation'
    | 'className'
    | 'style'
    | 'children'
    | 'render'
> & {
    /** The choices, in order. One is always chosen. */
    options: readonly SegmentedOption<Value>[];
    /** The chosen value, for a control that the parent controls. */
    value?: Value | undefined;
    /** The value chosen at first. Without one, the first option is chosen. */
    defaultValue?: Value | undefined;
    /** Called with the new value when a person chooses another segment. */
    onValueChange?: ((value: Value) => void) | undefined;
    className?: string | undefined;
    style?: CSSProperties | undefined;
};

/**
 * A row of segments where one is always chosen, like the list and grid views of a library, on Base UI's
 * `ToggleGroup`. A pill slides to the chosen segment, and the arrow keys move between segments.
 */
export default function SegmentedControl<Value extends string = string>({
    options,
    value,
    defaultValue,
    onValueChange,
    className,
    ...props
}: SegmentedControlProps<Value>) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [innerValue, setInnerValue] = useState(
        defaultValue ?? options[0]?.value
    );
    const current = value ?? innerValue;

    // The pill follows the place and size of the chosen segment, which change with the options, their text and the box.
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const place = () => {
            const chosen = root.querySelector<HTMLElement>('[data-pressed]');
            root.toggleAttribute('data-placed', chosen !== null);
            if (!chosen) return;
            root.style.setProperty('--segment-x', `${chosen.offsetLeft}px`);
            root.style.setProperty(
                '--segment-width',
                `${chosen.offsetWidth}px`
            );
        };
        place();
        const observer = new ResizeObserver(place);
        observer.observe(root);
        for (const item of root.children) observer.observe(item);
        return () => observer.disconnect();
    }, [current, options]);

    // Every segment needs an icon to fall back on, so the segments all change together.
    useLabelFallback(
        rootRef,
        options.every((option) => option.icon !== undefined),
        options
    );

    const choose = (groupValue: string[]) => {
        // A press on the chosen segment empties the group, but one segment always stays chosen.
        const next = options.find((option) => option.value === groupValue[0]);
        if (!next) return;
        setInnerValue(next.value);
        onValueChange?.(next.value);
    };

    return (
        <ToggleGroup
            {...props}
            ref={rootRef}
            value={current === undefined ? [] : [current]}
            onValueChange={choose}
            className={clsx('segmented-control', className)}
        >
            <span data-part="indicator" aria-hidden />
            {options.map((option) => (
                <Toggle
                    key={option.value}
                    value={option.value}
                    aria-label={option['aria-label']}
                    data-part="item"
                >
                    {option.icon && (
                        <span data-part="icon" aria-hidden>
                            {option.icon}
                        </span>
                    )}
                    {option.label !== undefined && (
                        <Text inline data-part="label">
                            {option.label}
                        </Text>
                    )}
                </Toggle>
            ))}
        </ToggleGroup>
    );
}
