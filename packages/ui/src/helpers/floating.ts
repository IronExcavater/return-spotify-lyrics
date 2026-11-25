import type { Side } from './geometry';

/** Where a popup sits next to the element that opens it. Popover, Tooltip and the menus share these props. */
export type FloatingProps = {
    /** The side of the trigger that the popup sits on. It moves to the other side when there is no room. */
    side?: Side;
    /** How the popup lines up along that side of the trigger. */
    align?: 'start' | 'center' | 'end';
    /** The space between the trigger and the popup, in pixels. */
    gap?: number;
    /** Shows an arrow that points at the trigger. */
    showArrow?: boolean;
};
