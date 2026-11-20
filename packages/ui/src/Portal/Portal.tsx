import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type PortalProps = {
    children?: ReactNode;
    /** The element to render into. */
    container?: Element | DocumentFragment | undefined;
};

/** Renders its children into another element, by default `document.body`. They stay in the same React tree. */
export default function Portal({
    children,
    container = document.body,
}: PortalProps) {
    return createPortal(children, container);
}
