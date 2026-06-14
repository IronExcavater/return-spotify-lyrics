import type { MutableRefObject } from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DropResult,
} from '@hello-pangea/dnd';
import { Flex } from '@radix-ui/themes';

import {
    MediaSection,
    type MediaSectionState,
} from '../../components/media/MediaSection';
import type { MediaShelfItem } from '../../types/mediaShelf';
import type { SectionStatus } from './state';

export function HomeSectionList({
    editing,
    isSearching,
    onChange,
    onDelete,
    onDragEnd,
    onLoadMoreSearch,
    onReorderItems,
    onRetry,
    sectionRefs,
    sections,
    statusById,
}: {
    editing: boolean;
    isSearching: boolean;
    onChange: (id: string, patch: Partial<MediaSectionState>) => void;
    onDelete: (id: string) => void;
    onDragEnd: (result: DropResult) => void;
    onLoadMoreSearch?: (sectionId: string) => void;
    onReorderItems: (id: string, next: MediaShelfItem[]) => void;
    onRetry: (sectionId: string) => void;
    sectionRefs: MutableRefObject<Map<string, HTMLDivElement>>;
    sections: MediaSectionState[];
    statusById: Record<string, SectionStatus>;
}) {
    return (
        <Flex
            pl="3"
            pr="1"
            pb="2"
            direction="column"
            gap="1"
            className="min-w-0"
        >
            <DragDropContext
                onDragEnd={onDragEnd}
                ignoreSizeLimits
                disableSecondaryAxisScroll
                zIndexOptions={{
                    dragging: 20,
                    dropAnimating: 20,
                }}
                lockSecondaryAxisMovement
                clampToVisibleBounds
            >
                <Droppable
                    droppableId="home-sections"
                    direction="vertical"
                    isDropDisabled={!editing}
                >
                    {(dropProvided) => (
                        <Flex
                            direction="column"
                            className="min-w-0"
                            gap="2"
                            ref={dropProvided.innerRef}
                            {...dropProvided.droppableProps}
                        >
                            {sections.map((section, index) => {
                                const status = statusById[section.id] ?? null;
                                return (
                                    <Draggable
                                        key={section.id}
                                        draggableId={section.id}
                                        index={index}
                                        isDragDisabled={!editing}
                                    >
                                        {(dragProvided, dragSnapshot) => (
                                            <div
                                                ref={(node) => {
                                                    dragProvided.innerRef(node);
                                                    if (node) {
                                                        sectionRefs.current.set(
                                                            section.id,
                                                            node
                                                        );
                                                    } else {
                                                        sectionRefs.current.delete(
                                                            section.id
                                                        );
                                                    }
                                                }}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                style={{
                                                    ...dragProvided
                                                        .draggableProps.style,
                                                }}
                                            >
                                                <MediaSection
                                                    section={section}
                                                    editing={editing}
                                                    stickyHeader={!editing}
                                                    loading={
                                                        status?.loading ?? false
                                                    }
                                                    headerLoading={false}
                                                    errorMessage={
                                                        status?.error ?? null
                                                    }
                                                    onRetry={onRetry}
                                                    dragging={
                                                        dragSnapshot.isDragging
                                                    }
                                                    onChange={onChange}
                                                    onDelete={onDelete}
                                                    onReorderItems={
                                                        onReorderItems
                                                    }
                                                    onLoadMore={
                                                        isSearching
                                                            ? onLoadMoreSearch
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {dropProvided.placeholder}
                        </Flex>
                    )}
                </Droppable>
            </DragDropContext>
        </Flex>
    );
}
