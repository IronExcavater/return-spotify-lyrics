import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../css';
import { resolveEdges, type Direction, type Side } from '../geometry';
import { easeStops, reverseEasing, type Easing } from '../gradient';

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

export type FadeBoxProps = ComponentPropsWithoutRef<'div'> & {
    enabled?: boolean;
    /** How far the fade goes in from each faded edge. */
    size?: CssLength;
    direction?: Direction;
    /** Round the corner where two faded sides meet. */
    corners?: boolean;
    easing?: Easing;
};

export default function FadeBox({
    enabled = true,
    size = 4,
    direction = ['left', 'right'],
    corners = true,
    easing = 'ease-in-out',
    className,
    style,
    ...props
}: FadeBoxProps) {
    const edges = resolveEdges(direction).map((edge) => edge.name);
    const fadeSize = enabled ? toCssSize(size) : '0px';
    // A square corner multiplies two full-size layers, so each side needs stops at its own size.
    const sideStops = Object.fromEntries(
        SIDES.map((side) => [
            `--fade-${side}-stops`,
            easeStops(`transparent, ${easing}, black var(--fade-${side}-size)`),
        ])
    );
    // The corner gradients have their own size, so their stops go from 0% to 100%.
    const stops = easeStops(`transparent, ${easing}, black`);
    // The round corner gradient runs from the inside out, so its curve runs backwards.
    const reverseStops = easeStops(
        `black, ${reverseEasing(easing)}, transparent`
    );

    return (
        <div
            {...props}
            className={clsx('fade-box', className)}
            data-fade={edges.join(' ')}
            data-corners={corners ? 'round' : 'square'}
            style={{
                '--fade-size': fadeSize,
                '--fade-stops': stops,
                '--fade-stops-reverse': reverseStops,
                ...sideStops,
                ...style,
            }}
        />
    );
}
