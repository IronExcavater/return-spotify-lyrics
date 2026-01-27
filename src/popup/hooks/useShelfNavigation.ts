import {
    type FocusEvent,
    type KeyboardEvent,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

type ScrollAlign = 'nearest' | 'start';

type Options = {
    containerRef: RefObject<HTMLElement | null>;
    itemCount: number;
    orientation?: 'vertical' | 'horizontal';
    itemsPerColumn?: number;
    interactive?: boolean;
};

export function useShelfNavigation({
    containerRef,
    itemCount,
    orientation = 'vertical',
    itemsPerColumn = 1,
    interactive = true,
}: Options) {
    const focusRefs = useRef<Array<HTMLElement | null>>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const lastScrollRef = useRef({ left: 0, top: 0 });
    const lastInteraction = useRef<'keyboard' | 'pointer'>('pointer');

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const update = () => {
            lastScrollRef.current = {
                left: node.scrollLeft,
                top: node.scrollTop,
            };
        };
        update();
        node.addEventListener('scroll', update, { passive: true });
        return () => node.removeEventListener('scroll', update);
    }, [containerRef]);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const handlePointerDown = () => {
            lastInteraction.current = 'pointer';
        };
        const handleKeyDown = () => {
            lastInteraction.current = 'keyboard';
        };
        node.addEventListener('pointerdown', handlePointerDown);
        node.addEventListener('keydown', handleKeyDown);
        return () => {
            node.removeEventListener('pointerdown', handlePointerDown);
            node.removeEventListener('keydown', handleKeyDown);
        };
    }, [containerRef]);

    useEffect(() => {
        if (activeIndex < itemCount) return;
        setActiveIndex(Math.max(0, itemCount - 1));
    }, [activeIndex, itemCount]);

    useEffect(() => {
        focusRefs.current = focusRefs.current.slice(0, itemCount);
    }, [itemCount]);

    const scrollToIndex = useCallback(
        (index: number, align: ScrollAlign = 'nearest') => {
            const node = focusRefs.current[index];
            const container = containerRef.current;
            if (!node || !container) return;
            const containerRect = container.getBoundingClientRect();
            const nodeRect = node.getBoundingClientRect();
            const pad = 12;
            if (orientation === 'horizontal') {
                if (align === 'start') {
                    container.scrollLeft = Math.max(0, node.offsetLeft - pad);
                    return;
                }
                const leftEdge = containerRect.left + pad;
                const rightEdge = containerRect.right - pad;
                if (nodeRect.left < leftEdge) {
                    container.scrollLeft -= leftEdge - nodeRect.left;
                } else if (nodeRect.right > rightEdge) {
                    container.scrollLeft += nodeRect.right - rightEdge;
                }
            } else {
                if (align === 'start') {
                    container.scrollTop = Math.max(0, node.offsetTop - pad);
                    return;
                }
                const topEdge = containerRect.top + pad;
                const bottomEdge = containerRect.bottom - pad;
                if (nodeRect.top < topEdge) {
                    container.scrollTop -= topEdge - nodeRect.top;
                } else if (nodeRect.bottom > bottomEdge) {
                    container.scrollTop += nodeRect.bottom - bottomEdge;
                }
            }
        },
        [containerRef, orientation]
    );

    const focusIndex = useCallback(
        (index: number, align: ScrollAlign = 'nearest') => {
            focusRefs.current[index]?.focus();
            setActiveIndex(index);
            scrollToIndex(index, align);
        },
        [scrollToIndex]
    );

    const getGridPosition = useCallback(
        (index: number) => {
            if (orientation !== 'horizontal' || itemsPerColumn <= 0) {
                return { row: index, col: 0 };
            }
            return {
                row: index % itemsPerColumn,
                col: Math.floor(index / itemsPerColumn),
            };
        },
        [itemsPerColumn, orientation]
    );

    const getIndexFromPosition = useCallback(
        (row: number, col: number) => {
            if (orientation !== 'horizontal' || itemsPerColumn <= 0) {
                return row;
            }
            return col * itemsPerColumn + row;
        },
        [itemsPerColumn, orientation]
    );

    const getMaxRowForColumn = useCallback(
        (col: number, total: number) => {
            if (orientation !== 'horizontal' || itemsPerColumn <= 0) return 0;
            const remaining = total - col * itemsPerColumn;
            return Math.max(0, Math.min(itemsPerColumn, remaining) - 1);
        },
        [itemsPerColumn, orientation]
    );

    const getEntryIndex = useCallback(
        (relatedTarget?: Node | null) => {
            const container = containerRef.current;
            if (!container) return 0;
            const containerRect = container.getBoundingClientRect();
            const relatedRect =
                relatedTarget instanceof HTMLElement
                    ? relatedTarget.getBoundingClientRect()
                    : null;
            const fromTop = relatedRect
                ? relatedRect.bottom <= containerRect.top
                : false;
            const fromBottom = relatedRect
                ? relatedRect.top >= containerRect.bottom
                : false;
            const fromLeft = relatedRect
                ? relatedRect.right <= containerRect.left
                : false;
            const fromRight = relatedRect
                ? relatedRect.left >= containerRect.right
                : false;

            const scrollLeft = lastScrollRef.current.left;
            const scrollTop = lastScrollRef.current.top;
            const viewportRight = scrollLeft + container.clientWidth;
            const viewportBottom = scrollTop + container.clientHeight;
            const total = itemCount;

            if (orientation === 'horizontal' && itemsPerColumn > 0) {
                const maxCol = Math.max(
                    0,
                    Math.ceil(total / itemsPerColumn) - 1
                );
                const findClosestRow = () => {
                    let bestRow = 0;
                    let bestDistance = Number.POSITIVE_INFINITY;
                    for (let row = 0; row < itemsPerColumn; row += 1) {
                        const index = getIndexFromPosition(row, 0);
                        const node = focusRefs.current[index];
                        if (!node) continue;
                        const distance = Math.abs(node.offsetTop - scrollTop);
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestRow = row;
                        }
                    }
                    return bestRow;
                };

                const findClosestColumn = () => {
                    let bestCol = 0;
                    let bestDistance = Number.POSITIVE_INFINITY;
                    for (let col = 0; col <= maxCol; col += 1) {
                        const index = getIndexFromPosition(0, col);
                        const node = focusRefs.current[index];
                        if (!node) continue;
                        const distance = Math.abs(node.offsetLeft - scrollLeft);
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestCol = col;
                        }
                    }
                    return bestCol;
                };

                if (fromTop || fromBottom) {
                    const col = findClosestColumn();
                    const row = fromTop ? 0 : getMaxRowForColumn(col, total);
                    return getIndexFromPosition(row, col);
                }

                if (fromLeft || fromRight) {
                    const row = findClosestRow();
                    const col = fromLeft ? 0 : maxCol;
                    const maxRow = getMaxRowForColumn(col, total);
                    return getIndexFromPosition(Math.min(row, maxRow), col);
                }
            }

            let firstVisibleIndex = -1;
            let lastVisibleIndex = -1;
            focusRefs.current.forEach((node, index) => {
                if (!node) return;
                const left = node.offsetLeft;
                const right = left + node.offsetWidth;
                const top = node.offsetTop;
                const bottom = top + node.offsetHeight;
                const visibleWidth = Math.max(
                    0,
                    Math.min(right, viewportRight) - Math.max(left, scrollLeft)
                );
                const visibleHeight = Math.max(
                    0,
                    Math.min(bottom, viewportBottom) - Math.max(top, scrollTop)
                );
                if (visibleWidth > 0 && visibleHeight > 0) {
                    if (firstVisibleIndex === -1) firstVisibleIndex = index;
                    lastVisibleIndex = index;
                }
            });

            if (fromBottom && lastVisibleIndex !== -1) return lastVisibleIndex;
            if (fromTop && firstVisibleIndex !== -1) return firstVisibleIndex;
            if (firstVisibleIndex !== -1) return firstVisibleIndex;
            return 0;
        },
        [
            containerRef,
            getIndexFromPosition,
            getMaxRowForColumn,
            itemCount,
            itemsPerColumn,
            orientation,
        ]
    );

    const handleItemFocus = useCallback(
        (event: FocusEvent<HTMLElement>, index: number) => {
            if (!interactive) return;
            if (lastInteraction.current !== 'keyboard') {
                setActiveIndex(index);
                return;
            }
            const scope = containerRef.current;
            const related = event.relatedTarget;
            const fromOutside =
                !scope ||
                !(related instanceof Node) ||
                !scope.contains(related);
            if (fromOutside) {
                const entryIndex = getEntryIndex(related);
                if (entryIndex !== index) {
                    focusRefs.current[entryIndex]?.focus();
                    setActiveIndex(entryIndex);
                    scrollToIndex(entryIndex, 'start');
                    return;
                }
            }
            setActiveIndex(index);
            scrollToIndex(index, 'nearest');
        },
        [containerRef, getEntryIndex, interactive, scrollToIndex]
    );

    const handleContainerFocusCapture = useCallback(
        (event: FocusEvent<HTMLElement>) => {
            if (!interactive) return;
            if (lastInteraction.current !== 'keyboard') return;
            const scope = containerRef.current;
            if (!scope) return;
            const related = event.relatedTarget;
            const fromOutside =
                !(related instanceof Node) || !scope.contains(related);
            if (!fromOutside) return;
            const entryIndex = getEntryIndex(related);
            const target = event.target as HTMLElement | null;
            const targetIndex =
                target?.dataset.index != null
                    ? Number(target.dataset.index)
                    : Number.NaN;
            if (Number.isFinite(targetIndex) && targetIndex === entryIndex)
                return;
            requestAnimationFrame(() => {
                focusIndex(entryIndex, 'start');
            });
        },
        [containerRef, focusIndex, getEntryIndex, interactive]
    );

    const handleContainerKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (!interactive) return;
            if (
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown' ||
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight'
            ) {
                event.preventDefault();
            }
        },
        [interactive]
    );

    const focusOutside = useCallback(
        (current: HTMLElement, direction: 'prev' | 'next') => {
            const scope = containerRef.current;
            if (!scope) return;
            const focusables = Array.from(
                document.querySelectorAll<HTMLElement>(
                    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
                )
            ).filter(
                (node) =>
                    !node.hasAttribute('disabled') &&
                    node.getAttribute('aria-disabled') !== 'true'
            );
            const index = focusables.indexOf(current);
            if (index === -1) return;
            const step = direction === 'next' ? 1 : -1;
            for (
                let next = index + step;
                next >= 0 && next < focusables.length;
                next += step
            ) {
                const candidate = focusables[next];
                if (!scope.contains(candidate)) {
                    candidate.focus();
                    break;
                }
            }
        },
        [containerRef]
    );

    const handleItemKeyDown = useCallback(
        (
            event: KeyboardEvent<HTMLElement>,
            index: number,
            canActivate: boolean,
            onActivate: () => void
        ) => {
            if (!interactive) return;
            if (
                event.key === 'ArrowUp' ||
                event.key === 'ArrowDown' ||
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowRight'
            ) {
                event.preventDefault();
            }
            if ((event.key === 'Enter' || event.key === ' ') && canActivate) {
                event.preventDefault();
                onActivate();
                return;
            }
            const total = itemCount;
            if (total === 0) return;
            const { row, col } = getGridPosition(index);
            let nextIndex = index;
            let moved = false;
            if (event.key === 'ArrowUp') {
                const nextRow = row - 1;
                if (nextRow >= 0) {
                    nextIndex = getIndexFromPosition(nextRow, col);
                    moved = true;
                } else {
                    focusOutside(event.currentTarget, 'prev');
                }
            } else if (event.key === 'ArrowDown') {
                const nextRow = row + 1;
                if (orientation === 'horizontal') {
                    const maxRow = getMaxRowForColumn(col, total);
                    if (nextRow <= maxRow) {
                        nextIndex = getIndexFromPosition(nextRow, col);
                        moved = true;
                    } else {
                        focusOutside(event.currentTarget, 'next');
                    }
                } else if (nextRow < total) {
                    nextIndex = nextRow;
                    moved = true;
                } else {
                    focusOutside(event.currentTarget, 'next');
                }
            } else if (
                orientation === 'horizontal' &&
                (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
            ) {
                const delta = event.key === 'ArrowRight' ? 1 : -1;
                const nextCol = col + delta;
                const maxCol = Math.max(
                    0,
                    Math.ceil(total / itemsPerColumn) - 1
                );
                if (nextCol >= 0 && nextCol <= maxCol) {
                    const maxRow = getMaxRowForColumn(nextCol, total);
                    const nextRow = Math.min(row, maxRow);
                    nextIndex = getIndexFromPosition(nextRow, nextCol);
                    moved = true;
                } else {
                    focusOutside(
                        event.currentTarget,
                        delta > 0 ? 'next' : 'prev'
                    );
                }
            }
            if (moved && nextIndex !== index) {
                event.preventDefault();
                focusIndex(nextIndex, 'start');
            }
        },
        [
            focusIndex,
            focusOutside,
            getGridPosition,
            getIndexFromPosition,
            getMaxRowForColumn,
            interactive,
            itemCount,
            itemsPerColumn,
            orientation,
        ]
    );

    return {
        focusRefs,
        activeIndex,
        setActiveIndex,
        handleItemFocus,
        handleContainerFocusCapture,
        handleContainerKeyDown,
        handleItemKeyDown,
        scrollToIndex,
    };
}
