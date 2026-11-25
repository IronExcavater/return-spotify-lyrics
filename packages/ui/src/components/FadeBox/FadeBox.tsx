import type { ComponentProps } from 'react';
import clsx from 'clsx';
import { toCssSize, type CssLength } from '../../helpers/css';
import { resolveEdges, type EdgeSet, type Side } from '../../helpers/geometry';
import { easeStops, reverseEasing, type Easing } from '../../helpers/gradient';

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

export type FadeBoxProps = ComponentProps<'div'> & {
    enabled?: boolean;
    /** How far the fade goes in from each faded edge. */
    depth?: CssLength;
    /** The edges that fade: `all`, `none` or a list of sides and corners. */
    edges?: EdgeSet;
    /** Round the corner where two faded sides meet. */
    roundCorners?: boolean;
    /** How the fade changes from clear at the edge to solid. */
    easing?: Easing;
};

/** Fades its content out at the edges with a CSS mask, so that it blends into what is behind it. */
export default function FadeBox({
    enabled = true,
    depth = 4,
    edges = ['left', 'right'],
    roundCorners = true,
    easing = 'ease-in-out',
    className,
    style,
    ...props
}: FadeBoxProps) {
    const fadedEdges = resolveEdges(edges).map((edge) => edge.name);
    const fadeSize = enabled ? toCssSize(depth) : '0px';
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
            data-fade={fadedEdges.join(' ')}
            data-corners={roundCorners ? 'round' : 'square'}
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
