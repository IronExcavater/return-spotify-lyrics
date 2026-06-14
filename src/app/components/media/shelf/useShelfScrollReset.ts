import { useEffect, useRef, type RefObject } from 'react';

import type { MediaShelfItem } from '../../../types/mediaShelf';
import type { MediaShelfOrientation } from './types';

export function useShelfScrollReset({
    orientation,
    scrollRef,
    visibleItems,
}: {
    orientation: MediaShelfOrientation;
    scrollRef: RefObject<HTMLDivElement | null>;
    visibleItems: MediaShelfItem[];
}) {
    const lastItemsRef = useRef<{
        firstId: string | null;
        length: number;
        loading: boolean;
    } | null>(null);

    useEffect(() => {
        const node = scrollRef.current;
        if (!node) return;
        const firstId = visibleItems[0]?.id ?? null;
        const loading = Boolean(visibleItems[0]?.loading);
        const previous = lastItemsRef.current;
        lastItemsRef.current = {
            firstId,
            length: visibleItems.length,
            loading,
        };
        if (!previous) return;
        if (previous.loading || loading) return;
        const replaced = previous.firstId !== firstId;
        const shrunk = visibleItems.length < previous.length;
        if (!replaced && !shrunk) return;
        if (orientation === 'horizontal') node.scrollLeft = 0;
        else node.scrollTop = 0;
    }, [orientation, scrollRef, visibleItems]);
}
