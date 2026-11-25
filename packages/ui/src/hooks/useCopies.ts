import { useEffect, type RefObject } from 'react';

const HIGHLIGHT = 'copy-selection';

const FOCUSABLE =
    'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]';

/**
 * Makes the copies in a container act like the original, for a component that repeats its content, like a Marquee
 * loop. Each direct child of the container holds the same content, and each copy has `data-copy`. A hover, a press or
 * a text selection in one child shows in all of them, and only the original stays in the tab order. While a person
 * selects text in it, the container has `data-selecting`.
 */
export default function useCopies(
    containerRef: RefObject<HTMLElement | null>,
    enabled = true
): void {
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) return;

        const ranges = new Set<Range>();
        const hover = (event: PointerEvent) => {
            const target =
                event.type === 'pointerout'
                    ? event.relatedTarget
                    : event.target;
            markMatches(container, target, 'data-hover');
        };
        const press = (event: PointerEvent) => {
            const target = event.type === 'pointerdown' ? event.target : null;
            markMatches(container, target, 'data-active');
        };
        const select = () => {
            container.toggleAttribute(
                'data-selecting',
                mirrorSelection(container, ranges)
            );
        };
        const observer = new MutationObserver(() => hideCopies(container));

        hideCopies(container);
        observer.observe(container, { childList: true, subtree: true });
        container.addEventListener('pointerover', hover);
        container.addEventListener('pointerout', hover);
        container.addEventListener('pointerdown', press);
        window.addEventListener('pointerup', press);
        window.addEventListener('pointercancel', press);
        document.addEventListener('selectionchange', select);
        return () => {
            observer.disconnect();
            container.removeEventListener('pointerover', hover);
            container.removeEventListener('pointerout', hover);
            container.removeEventListener('pointerdown', press);
            window.removeEventListener('pointerup', press);
            window.removeEventListener('pointercancel', press);
            document.removeEventListener('selectionchange', select);
            markMatches(container, null, 'data-hover');
            markMatches(container, null, 'data-active');
            clearSelection(ranges);
            container.removeAttribute('data-selecting');
        };
    }, [containerRef, enabled]);
}

// One registered highlight holds the copied selection ranges of every container.
let highlight: Highlight | undefined;

// Marks the node in each item that matches `target`, and its parents in the item, the same way that `:hover` matches.
function markMatches(
    container: HTMLElement,
    target: EventTarget | null,
    attribute: 'data-hover' | 'data-active'
): void {
    for (const marked of container.querySelectorAll(`[${attribute}]`)) {
        marked.removeAttribute(attribute);
    }

    const item = target instanceof Node ? findItem(container, target) : null;
    const path = item && target instanceof Node ? findPath(item, target) : null;
    if (!path) return;

    for (const other of container.children) {
        markParents(other, resolvePath(other, path), attribute);
    }
}

// Shows the text selection in every item, and says whether the selection is in the container.
function mirrorSelection(container: HTMLElement, ranges: Set<Range>): boolean {
    clearSelection(ranges);

    const selection = document.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || range.collapsed) return false;
    if (!container.contains(range.commonAncestorContainer)) return false;

    // A selection across two items has no single place in the other items.
    const item = findItem(container, range.startContainer);
    const isInOneItem =
        item && item === findItem(container, range.endContainer);
    if (!isInOneItem || !('highlights' in CSS)) return true;

    highlight ??= new Highlight();
    CSS.highlights.set(HIGHLIGHT, highlight);
    for (const other of container.children) {
        if (other === item) continue;
        const copy = copyRange(item, other, range);
        if (!copy) continue;
        highlight.add(copy);
        ranges.add(copy);
    }
    return true;
}

// Removes the copied selection ranges from the highlight.
function clearSelection(ranges: Set<Range>): void {
    for (const range of ranges) highlight?.delete(range);
    ranges.clear();
}

// Takes the focusable elements in the copies out of the tab order, because a person needs to reach the content once.
function hideCopies(container: HTMLElement): void {
    const copies = `:scope > [data-copy] :is(${FOCUSABLE})`;
    for (const element of container.querySelectorAll(copies)) {
        element.setAttribute('tabindex', '-1');
    }
}

// The item is the direct child of the container that holds the node.
function findItem(container: HTMLElement, node: Node): Element | null {
    let current: Node | null = node;
    while (current && current.parentNode !== container) {
        current = current.parentNode;
    }
    return current instanceof Element ? current : null;
}

// Each item renders the same children, so a path of child indexes finds the same node in every item.
function findPath(item: Node, node: Node): number[] | null {
    const path: number[] = [];
    for (let current = node; current !== item;) {
        const parent = current.parentNode;
        if (!parent) return null;
        path.unshift([...parent.childNodes].indexOf(current as ChildNode));
        current = parent;
    }
    return path;
}

function resolvePath(item: Node, path: readonly number[]): Node | null {
    let node: Node | null = item;
    for (const index of path) node = node?.childNodes[index] ?? null;
    return node;
}

function markParents(item: Element, node: Node | null, attribute: string) {
    let element =
        node instanceof Element ? node : (node?.parentElement ?? null);
    for (; element && element !== item; element = element.parentElement) {
        element.setAttribute(attribute, '');
    }
}

function copyRange(from: Element, to: Element, range: Range): Range | null {
    const start = findPath(from, range.startContainer);
    const end = findPath(from, range.endContainer);
    const startNode = start && resolvePath(to, start);
    const endNode = end && resolvePath(to, end);
    if (!startNode || !endNode) return null;

    const copy = new Range();
    copy.setStart(startNode, range.startOffset);
    copy.setEnd(endNode, range.endOffset);
    return copy;
}
