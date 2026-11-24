const HIGHLIGHT = 'marquee-selection';

const FOCUSABLE =
    'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable]';

// One registered highlight holds the copied selection ranges of every marquee.
let highlight: Highlight | undefined;

/** Marks the node in each item that matches `target`, and its parents in the item, the same way that `:hover` matches. */
export function markMatches(
    track: HTMLElement,
    target: EventTarget | null,
    attribute: 'data-hover' | 'data-active'
): void {
    for (const marked of track.querySelectorAll(`[${attribute}]`)) {
        marked.removeAttribute(attribute);
    }

    const item = target instanceof Node ? findItem(track, target) : null;
    const path = item && target instanceof Node ? findPath(item, target) : null;
    if (!path) return;

    for (const other of track.children) {
        markParents(other, resolvePath(other, path), attribute);
    }
}

/** Shows the text selection in every item, and says whether the selection is in the track. */
export function mirrorSelection(
    track: HTMLElement,
    ranges: Set<Range>
): boolean {
    clearSelection(ranges);

    const selection = document.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || range.collapsed) return false;
    if (!track.contains(range.commonAncestorContainer)) return false;

    // A selection across two items has no single place in the other items.
    const item = findItem(track, range.startContainer);
    const isInOneItem = item && item === findItem(track, range.endContainer);
    if (!isInOneItem || !('highlights' in CSS)) return true;

    highlight ??= new Highlight();
    CSS.highlights.set(HIGHLIGHT, highlight);
    for (const other of track.children) {
        if (other === item) continue;
        const copy = copyRange(item, other, range);
        if (!copy) continue;
        highlight.add(copy);
        ranges.add(copy);
    }
    return true;
}

/** Removes the copied selection ranges from the highlight. */
export function clearSelection(ranges: Set<Range>): void {
    for (const range of ranges) highlight?.delete(range);
    ranges.clear();
}

/** Takes the focusable elements in the copies out of the tab order, because a person needs to reach the content once. */
export function hideCopies(track: HTMLElement): void {
    const copies = `:scope > [data-copy] :is(${FOCUSABLE})`;
    for (const element of track.querySelectorAll(copies)) {
        element.setAttribute('tabindex', '-1');
    }
}

// The item is the direct child of the track that holds the node.
function findItem(track: HTMLElement, node: Node): Element | null {
    let current: Node | null = node;
    while (current && current.parentNode !== track) {
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
