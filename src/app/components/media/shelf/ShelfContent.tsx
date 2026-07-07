import { Fragment, type ReactNode, type RefObject } from 'react';
import {
    Draggable,
    type DraggableProvided,
    type DroppableProvided,
} from '@hello-pangea/dnd';
import { Flex } from '@radix-ui/themes';

import type { MediaShelfItem } from '../../../types/mediaShelf';
import { getShelfItemKey } from './layout';
import type { MediaShelfOrientation, RenderableShelfItem } from './types';

type RenderItemInput = {
    dragProvided?: DraggableProvided;
    index: number;
    item: MediaShelfItem;
    loaded: boolean;
};

type Props = {
    bottomVirtualSpaceHeight: number;
    columnWidth?: number;
    columns: MediaShelfItem[][];
    draggable: boolean;
    dropPlaceholder?: DroppableProvided['placeholder'];
    isVirtualDroppable: boolean;
    itemsPerColumn: number;
    orientation: MediaShelfOrientation;
    renderedVerticalItems: RenderableShelfItem[];
    renderItem: (input: RenderItemInput) => ReactNode;
    sentinelRef: RefObject<HTMLDivElement>;
    topVirtualSpaceHeight: number;
};

export function ShelfContent({
    bottomVirtualSpaceHeight,
    columnWidth,
    columns,
    draggable,
    dropPlaceholder,
    isVirtualDroppable,
    itemsPerColumn,
    orientation,
    renderedVerticalItems,
    renderItem,
    sentinelRef,
    topVirtualSpaceHeight,
}: Props) {
    if (orientation === 'horizontal') {
        return (
            <>
                {columns.map((column, columnIndex) => (
                    <ShelfColumn
                        key={`col-${columnIndex}`}
                        column={column}
                        columnIndex={columnIndex}
                        columnWidth={columnWidth}
                        draggable={draggable}
                        itemsPerColumn={itemsPerColumn}
                        renderItem={renderItem}
                    />
                ))}
                <div
                    ref={sentinelRef}
                    aria-hidden
                    className="h-full w-px flex-none"
                />
            </>
        );
    }

    const loadedItems = renderedVerticalItems.filter(({ loaded }) => loaded);
    const loadingItems = renderedVerticalItems.filter(({ loaded }) => !loaded);

    return (
        <>
            <VirtualSpacer height={topVirtualSpaceHeight} />
            {loadedItems.map(({ item, index }) =>
                renderMaybeDraggable({
                    draggable,
                    item,
                    index,
                    loaded: true,
                    renderItem,
                })
            )}
            <div
                ref={sentinelRef}
                aria-hidden
                className="h-px w-full flex-none"
            />
            {loadingItems.map(({ item, index }) =>
                renderStaticItem({ item, index, loaded: false, renderItem })
            )}
            {!isVirtualDroppable && dropPlaceholder}
            <VirtualSpacer height={bottomVirtualSpaceHeight} />
        </>
    );
}

function ShelfColumn({
    column,
    columnIndex,
    columnWidth,
    draggable,
    itemsPerColumn,
    renderItem,
}: {
    column: MediaShelfItem[];
    columnIndex: number;
    columnWidth?: number;
    draggable: boolean;
    itemsPerColumn: number;
    renderItem: (input: RenderItemInput) => ReactNode;
}) {
    return (
        <Flex
            direction="column"
            gap="1"
            className="min-w-0 flex-none"
            style={
                columnWidth
                    ? {
                          flexBasis: columnWidth,
                          width: columnWidth,
                      }
                    : undefined
            }
        >
            {column.map((item, index) =>
                renderMaybeDraggable({
                    draggable,
                    item,
                    index: columnIndex * itemsPerColumn + index,
                    loaded: true,
                    renderItem,
                })
            )}
        </Flex>
    );
}

function renderMaybeDraggable({
    draggable,
    item,
    index,
    loaded,
    renderItem,
}: {
    draggable: boolean;
    item: MediaShelfItem;
    index: number;
    loaded: boolean;
    renderItem: (input: RenderItemInput) => ReactNode;
}) {
    const key = getShelfItemKey(item, index);
    if (!draggable) {
        return (
            <Fragment key={key}>{renderItem({ item, index, loaded })}</Fragment>
        );
    }

    return (
        <Draggable
            key={key}
            draggableId={key}
            index={index}
            disableInteractiveElementBlocking
        >
            {(dragProvided) =>
                renderItem({ item, index, loaded, dragProvided })
            }
        </Draggable>
    );
}

function renderStaticItem({
    item,
    index,
    loaded,
    renderItem,
}: {
    item: MediaShelfItem;
    index: number;
    loaded: boolean;
    renderItem: (input: RenderItemInput) => ReactNode;
}) {
    return (
        <Fragment key={getShelfItemKey(item, index)}>
            {renderItem({ item, index, loaded })}
        </Fragment>
    );
}

function VirtualSpacer({ height }: { height: number }) {
    if (height <= 0) return null;

    return <div aria-hidden className="w-full flex-none" style={{ height }} />;
}
