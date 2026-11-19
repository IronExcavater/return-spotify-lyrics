import {
    useLayoutEffect,
    useRef,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';
import Portal from './Portal';

export type PortalSlots<Name extends string> = {
    /** An empty element for each name. Put each one where the content can show. */
    slots: Record<Name, ReactElement>;
    /** The content. Render it after the slots, so that it is in the page before its own effects run. */
    portal: ReactElement;
};

/**
 * Shows `children` in the active slot. A new active slot moves the content without a remount, so it keeps its
 * state and focus. With no active slot, the content leaves the page but keeps its state.
 */
export default function usePortalSlot<Name extends string>(
    names: readonly Name[],
    active: Name | undefined,
    children: ReactNode
): PortalSlots<Name> {
    const [host] = useState(createHost);

    // Each slot runs its effect before this one, so a host still outside the active slot has no slot.
    useLayoutEffect(() => {
        if (host.parentElement?.dataset.slot === active) return;
        host.remove();
        lostFocus.delete(host);
    }, [host, active]);

    const slots = Object.fromEntries(
        names.map((name) => [
            name,
            <Slot
                key={name}
                name={name}
                host={host}
                active={name === active}
            />,
        ])
    ) as Record<Name, ReactElement>;

    return { slots, portal: <Portal container={host}>{children}</Portal> };
}

type SlotProps = {
    name: string;
    host: HTMLElement;
    active: boolean;
};

function Slot({ name, host, active }: SlotProps) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const slot = ref.current;
        if (!active || !slot) return;
        if (host.parentElement !== slot) moveHost(host, slot);
        // React removes an old slot, and the host in it, after this cleanup, so the cleanup keeps the focus.
        return () => keepFocus(host);
    }, [host, active]);

    return <div ref={ref} className="portal-slot" data-slot={name} />;
}

// The element in each host that had focus when its slot went away.
const lostFocus = new WeakMap<HTMLElement, HTMLElement>();

function keepFocus(host: HTMLElement) {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && host.contains(focused)) {
        lostFocus.set(host, focused);
    }
}

function createHost() {
    const host = document.createElement('div');
    host.dataset.part = 'host';
    return host;
}

// TypeScript's DOM types do not have moveBefore yet.
type MoveTarget = HTMLElement & {
    moveBefore?: (node: Node, child: Node | null) => void;
};

function moveHost(host: HTMLElement, slot: MoveTarget) {
    keepFocus(host);
    const focused = lostFocus.get(host);
    lostFocus.delete(host);

    // moveBefore keeps focus and other element state, but it can move only a node that is in the page.
    if (host.isConnected && slot.moveBefore) slot.moveBefore(host, null);
    else slot.append(host);

    // Focus goes back only if nothing else took it in the meantime.
    const isFree = document.activeElement === document.body;
    if (focused && isFree && host.contains(focused)) {
        focused.focus({ preventScroll: true });
    }
}
