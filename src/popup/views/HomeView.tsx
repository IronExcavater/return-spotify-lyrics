import { useCallback, useMemo, useState } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from '@hello-pangea/dnd';
import { PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Flex, Text, IconButton, Switch, DropdownMenu } from '@radix-ui/themes';

import {
    MediaSection,
    type MediaSectionState,
    type MediaSectionVariant,
    type MediaSectionOrientation,
} from '../components/MediaSection';
import type { MediaShelfItem } from '../components/MediaShelf';
import type { SearchFilter } from '../hooks/useSearch';

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

function makeItems(
    prefix: string,
    start: number,
    count: number,
    titlePrefix: string,
    subtitlePrefix: string
): MediaShelfItem[] {
    return Array.from({ length: count }).map((_, idx) => {
        const n = start + idx;
        return {
            id: `${prefix}-${n}`,
            title: `${titlePrefix} ${n}`,
            subtitle: `${subtitlePrefix} ${n}`,
        };
    });
}

const INITIAL_SECTIONS: MediaSectionState[] = [
    {
        id: 'featured',
        title: 'Featured mixes',
        subtitle: 'Hand-picked sets',
        variant: 'tile',
        orientation: 'horizontal',
        itemsPerColumn: 2,
        maxVisible: 4,
        fixedHeight: 260,
        clampUnit: 'items',
        items: makeItems('f', 1, 12, 'Album', 'Curated'),
        hasMore: true,
        loadingMore: false,
    },
    {
        id: 'recent',
        title: 'Recent plays',
        subtitle: 'Your latest queue',
        variant: 'list',
        orientation: 'horizontal',
        itemsPerColumn: 3,
        maxVisible: 4,
        fixedHeight: 240,
        clampUnit: 'px',
        items: makeItems('r', 1, 18, 'Song', 'Artist'),
        hasMore: true,
        loadingMore: false,
    },
    {
        id: 'saved',
        title: 'Saved tracks',
        subtitle: 'Quick picks',
        variant: 'list',
        orientation: 'vertical',
        itemsPerColumn: 6,
        maxVisible: 8,
        fixedHeight: 320,
        clampUnit: 'items',
        items: makeItems('s', 1, 15, 'Track', 'Performer'),
        hasMore: true,
        loadingMore: false,
    },
];

export function HomeView({
    searchQuery: _searchQuery,
    filters: _filters,
}: Props) {
    const [sections, setSections] =
        useState<MediaSectionState[]>(INITIAL_SECTIONS);
    const [editing, setEditing] = useState(false);

    const resetSections = useCallback(() => {
        setSections(INITIAL_SECTIONS);
    }, []);

    const updateSection = useCallback(
        (id: string, patch: Partial<MediaSectionState>) => {
            setSections((prev) =>
                prev.map((section) =>
                    section.id === id ? { ...section, ...patch } : section
                )
            );
        },
        []
    );

    const updateItems = useCallback((id: string, next: MediaShelfItem[]) => {
        setSections((prev) =>
            prev.map((section) =>
                section.id === id ? { ...section, items: next } : section
            )
        );
    }, []);

    const removeSection = useCallback((id: string) => {
        setSections((prev) => prev.filter((section) => section.id !== id));
    }, []);

    const addSection = useCallback((variant: MediaSectionVariant) => {
        const id = `sec-${Date.now()}`;
        const orientation: MediaSectionOrientation =
            variant === 'tile' ? 'horizontal' : 'vertical';
        const nextSection: MediaSectionState = {
            id,
            title: variant === 'tile' ? 'New albums' : 'New list',
            subtitle: 'Custom section',
            variant,
            orientation,
            itemsPerColumn: orientation === 'horizontal' ? 2 : 6,
            maxVisible: orientation === 'horizontal' ? 3 : 8,
            fixedHeight: orientation === 'vertical' ? 320 : 240,
            items: makeItems(id, 1, 10, 'Item', 'Artist'),
            hasMore: true,
            loadingMore: false,
        };
        setSections((prev) => [...prev, nextSection]);
    }, []);

    const loadMore = useCallback((id: string) => {
        setSections((prev) => {
            const target = prev.find((section) => section.id === id);
            if (!target || target.loadingMore || target.hasMore === false)
                return prev;

            const updated = prev.map((section) =>
                section.id === id ? { ...section, loadingMore: true } : section
            );

            setTimeout(() => {
                setSections((current) =>
                    current.map((section) => {
                        if (section.id !== id || section.loadingMore === false)
                            return section;
                        const start = section.items.length + 1;
                        const added = makeItems(
                            section.id,
                            start,
                            8,
                            section.title,
                            'Artist'
                        );
                        const items = [...section.items, ...added];
                        const hasMore = items.length < 60;
                        return {
                            ...section,
                            items,
                            hasMore,
                            loadingMore: false,
                        };
                    })
                );
            }, 350);

            return updated;
        });
    }, []);

    const onSectionDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;
            const next = [...sections];
            const [moved] = next.splice(result.source.index, 1);
            next.splice(result.destination.index, 0, moved);
            setSections(next);
        },
        [sections]
    );

    const totalItems = useMemo(
        () => sections.reduce((acc, section) => acc + section.items.length, 0),
        [sections]
    );

    return (
        <Flex
            flexGrow="1"
            direction="column"
            gap="3"
            className="no-overflow-anchor min-h-0 min-w-0 overflow-y-auto"
        >
            <Flex p="1" direction="column" gap="3" className="min-w-0">
                <Flex align="center" justify="between" gap="3">
                    <Flex direction="column">
                        <Text size="4" weight="bold">
                            Home
                        </Text>
                        <Text size="1" color="gray">
                            {totalItems} items across {sections.length} sections
                        </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Flex align="center" gap="1">
                            <Text size="1" color="gray">
                                Edit
                            </Text>
                            <Switch
                                size="1"
                                checked={editing}
                                onCheckedChange={setEditing}
                                aria-label="Toggle edit mode"
                            />
                        </Flex>
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                <IconButton
                                    size="1"
                                    variant="soft"
                                    highContrast
                                    radius="full"
                                    aria-label="Add section"
                                >
                                    <PlusIcon />
                                </IconButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end" size="1">
                                <DropdownMenu.Item
                                    onSelect={() => addSection('list')}
                                >
                                    Add list section
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    onSelect={() => addSection('tile')}
                                >
                                    Add tiles section
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                        <IconButton
                            size="1"
                            variant="ghost"
                            aria-label="Reset layout"
                            onClick={resetSections}
                        >
                            <ReloadIcon />
                        </IconButton>
                    </Flex>
                </Flex>

                <DragDropContext onDragEnd={onSectionDragEnd}>
                    <Droppable
                        droppableId="home-sections"
                        direction="vertical"
                        isDropDisabled={!editing}
                    >
                        {(dropProvided) => (
                            <Flex
                                direction="column"
                                gap="5"
                                className="min-w-0"
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                            >
                                {sections.map((section, index) => (
                                    <Draggable
                                        key={section.id}
                                        draggableId={section.id}
                                        index={index}
                                        isDragDisabled={!editing}
                                    >
                                        {(dragProvided, dragSnapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                            >
                                                <MediaSection
                                                    section={section}
                                                    editing={editing}
                                                    dragging={
                                                        dragSnapshot.isDragging
                                                    }
                                                    onChange={updateSection}
                                                    onDelete={removeSection}
                                                    onReorderItems={updateItems}
                                                    onLoadMore={loadMore}
                                                    className="pb-2"
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {dropProvided.placeholder}
                            </Flex>
                        )}
                    </Droppable>
                </DragDropContext>
            </Flex>
        </Flex>
    );
}
