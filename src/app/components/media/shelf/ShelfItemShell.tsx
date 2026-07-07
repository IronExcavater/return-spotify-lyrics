import {
    type CSSProperties,
    type FocusEvent,
    type KeyboardEvent,
    type MutableRefObject,
} from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import clsx from 'clsx';

import type { MediaShelfItem } from '../../../types/mediaShelf';
import { buildShelfItemView, type ShelfItemViewInput } from './itemView';
import { getShelfItemKey, hashShelfItemId } from './layout';

export type ShelfItemRenderContext = Omit<
    ShelfItemViewInput,
    'index' | 'item' | 'seed'
>;

type Props = {
    activeIndex: number;
    dragProvided?: DraggableProvided;
    focusRefs: MutableRefObject<Array<HTMLElement | null>>;
    handleItemFocus: (event: FocusEvent<HTMLElement>, index: number) => void;
    handleItemKeyDown: (
        event: KeyboardEvent<HTMLElement>,
        index: number,
        canActivate: boolean,
        onActivate: () => void
    ) => void;
    index: number;
    interactive: boolean;
    isClone?: boolean;
    item: MediaShelfItem;
    loaded: boolean;
    offscreenItemStyle?: CSSProperties;
    renderContext: ShelfItemRenderContext;
};

export function ShelfItemShell({
    activeIndex,
    dragProvided,
    focusRefs,
    handleItemFocus,
    handleItemKeyDown,
    index,
    interactive,
    isClone = false,
    item,
    loaded,
    offscreenItemStyle,
    renderContext,
}: Props) {
    const itemKey = getShelfItemKey(item, index);
    const { canActivate, content, handleNavigate } = buildShelfItemView({
        ...renderContext,
        item,
        index,
        seed: hashShelfItemId(itemKey) ^ (index << 1),
    });
    const style = resolveShelfItemStyle({
        cloneWidth: isClone
            ? focusRefs.current[index]?.getBoundingClientRect().width
            : undefined,
        draggableStyle: dragProvided?.draggableProps.style,
        offscreenItemStyle: dragProvided ? undefined : offscreenItemStyle,
    });
    const isTabStop =
        !isClone &&
        interactive &&
        loaded &&
        canActivate &&
        index === activeIndex;

    return (
        <div
            ref={(node) => {
                dragProvided?.innerRef(node);
                if (!isClone) focusRefs.current[index] = node;
            }}
            data-index={index}
            data-media-shelf-item="true"
            {...dragProvided?.draggableProps}
            {...(dragProvided?.dragHandleProps ?? undefined)}
            role={canActivate ? 'button' : undefined}
            style={style}
            className={clsx(
                'group rounded-2 bg-background focus-visible:ring-accent-9 focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
                dragProvided && loaded && 'cursor-grab active:cursor-grabbing'
            )}
            tabIndex={isTabStop ? 0 : -1}
            onFocus={
                !isClone && loaded
                    ? (event) => handleItemFocus(event, index)
                    : undefined
            }
            onKeyDown={
                !isClone && loaded
                    ? (event) =>
                          handleItemKeyDown(
                              event,
                              index,
                              canActivate,
                              handleNavigate
                          )
                    : undefined
            }
        >
            {content}
        </div>
    );
}

function resolveShelfItemStyle({
    cloneWidth,
    draggableStyle,
    offscreenItemStyle,
}: {
    cloneWidth?: number;
    draggableStyle?: CSSProperties;
    offscreenItemStyle?: CSSProperties;
}): CSSProperties | undefined {
    if (!cloneWidth && !draggableStyle && !offscreenItemStyle) return undefined;

    return {
        ...(cloneWidth
            ? {
                  boxSizing: 'border-box',
                  maxWidth: cloneWidth,
                  width: cloneWidth,
              }
            : undefined),
        ...draggableStyle,
        ...offscreenItemStyle,
    };
}
