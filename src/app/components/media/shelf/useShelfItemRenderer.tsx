import {
    type CSSProperties,
    type FocusEvent,
    type KeyboardEvent,
    type MutableRefObject,
    useCallback,
    useMemo,
} from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';

import type { MediaShelfItem } from '../../../types/mediaShelf';
import type { ShelfHistory } from './itemView';
import { ShelfItemShell, type ShelfItemRenderContext } from './ShelfItemShell';
import type { MediaShelfProps } from './types';

type RenderShelfItemInput = {
    dragProvided?: DraggableProvided;
    index: number;
    isClone?: boolean;
    item: MediaShelfItem;
    loaded: boolean;
};

export function useShelfItemRenderer({
    activeIndex,
    cardSize,
    effectiveColumnWidth,
    enablePrimaryPlay,
    focusRefs,
    getActions,
    getRowProps,
    handleItemFocus,
    handleItemKeyDown,
    interactive,
    offscreenItemStyle,
    orientation,
    premiumPlaybackBlocked,
    routeHistory,
    showImage,
    trackSubtitleMode,
    variant,
    visibleItems,
}: {
    activeIndex: number;
    cardSize?: MediaShelfProps['cardSize'];
    effectiveColumnWidth?: number;
    enablePrimaryPlay: boolean;
    focusRefs: MutableRefObject<Array<HTMLElement | null>>;
    getActions?: MediaShelfProps['getActions'];
    getRowProps?: MediaShelfProps['getRowProps'];
    handleItemFocus: (event: FocusEvent<HTMLElement>, index: number) => void;
    handleItemKeyDown: (
        event: KeyboardEvent<HTMLElement>,
        index: number,
        canActivate: boolean,
        onActivate: () => void
    ) => void;
    interactive: boolean;
    offscreenItemStyle?: CSSProperties;
    orientation: MediaShelfProps['orientation'];
    premiumPlaybackBlocked: boolean;
    routeHistory: ShelfHistory;
    showImage: boolean;
    trackSubtitleMode?: MediaShelfProps['trackSubtitleMode'];
    variant: MediaShelfProps['variant'];
    visibleItems: MediaShelfItem[];
}) {
    const renderContext = useMemo<ShelfItemRenderContext>(
        () => ({
            cardSize,
            effectiveColumnWidth,
            enablePrimaryPlay,
            getActions,
            getRowProps,
            orientation,
            premiumPlaybackBlocked,
            routeHistory,
            showImage,
            trackSubtitleMode,
            variant,
        }),
        [
            cardSize,
            effectiveColumnWidth,
            enablePrimaryPlay,
            getActions,
            getRowProps,
            orientation,
            premiumPlaybackBlocked,
            routeHistory,
            showImage,
            trackSubtitleMode,
            variant,
        ]
    );
    const renderShelfItem = useCallback(
        ({
            item,
            index,
            loaded,
            dragProvided,
            isClone = false,
        }: RenderShelfItemInput) => (
            <ShelfItemShell
                activeIndex={activeIndex}
                dragProvided={dragProvided}
                focusRefs={focusRefs}
                handleItemFocus={handleItemFocus}
                handleItemKeyDown={handleItemKeyDown}
                index={index}
                interactive={interactive}
                isClone={isClone}
                item={item}
                loaded={loaded}
                offscreenItemStyle={offscreenItemStyle}
                renderContext={renderContext}
            />
        ),
        [
            activeIndex,
            focusRefs,
            handleItemFocus,
            handleItemKeyDown,
            interactive,
            offscreenItemStyle,
            renderContext,
        ]
    );
    const renderVirtualClone = useCallback(
        (
            dragProvided: DraggableProvided,
            _snapshot: unknown,
            rubric: { source: { index: number } }
        ) => {
            const item = visibleItems[rubric.source.index];
            if (!item) return null;
            return renderShelfItem({
                item,
                index: rubric.source.index,
                loaded: true,
                dragProvided,
                isClone: true,
            });
        },
        [renderShelfItem, visibleItems]
    );

    return { renderShelfItem, renderVirtualClone };
}
