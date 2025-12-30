import { useCallback, useState } from 'react';
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from '@hello-pangea/dnd';
import { PlusIcon } from '@radix-ui/react-icons';
import {
    Flex,
    Text,
    IconButton,
    Switch,
    DropdownMenu,
    Button,
    AlertDialog,
} from '@radix-ui/themes';

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

    return (
        <Flex
            flexGrow="1"
            direction="column"
            gap="3"
            className="no-overflow-anchor min-h-0 min-w-0 overflow-y-auto"
        >
            <Flex p="3" direction="column" gap="3" className="min-w-0">
                <Flex align="center" justify="between" gap="3">
                    {!editing && (
                        <Flex align="center" gap="2">
                            <Text size="3" weight="bold">
                                Welcome back{' '}
                                {/* TODO: Make the title and subtitle something personalised that changes based on various situations, e.g. how long you've used this, num of sessions, time of day, etc. */}
                            </Text>
                            <Text size="1" color="gray">
                                Short message{' '}
                                {/* TODO: Write a short message */}
                            </Text>
                        </Flex>
                    )}
                    {editing && (
                        <Flex align="center" gap="2">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <IconButton
                                        size="1"
                                        variant="soft"
                                        color="green"
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

                            <AlertDialog.Root>
                                <AlertDialog.Trigger>
                                    <Button size="1" variant="soft" color="red">
                                        Restore
                                    </Button>
                                </AlertDialog.Trigger>
                                <AlertDialog.Content maxWidth="300px" size="1">
                                    <AlertDialog.Title size="3">
                                        Revert home layout?
                                    </AlertDialog.Title>
                                    <AlertDialog.Description size="2">
                                        This restores the default shelves and
                                        order. Your current arrangement will be
                                        lost.
                                    </AlertDialog.Description>
                                    <Flex mt="3" justify="end" gap="2">
                                        <AlertDialog.Cancel>
                                            <Button variant="soft" size="1">
                                                Cancel
                                            </Button>
                                        </AlertDialog.Cancel>
                                        <AlertDialog.Action>
                                            <Button
                                                variant="soft"
                                                color="red"
                                                size="1"
                                                onClick={resetSections}
                                                autoFocus
                                            >
                                                Revert
                                            </Button>
                                        </AlertDialog.Action>
                                    </Flex>
                                </AlertDialog.Content>
                            </AlertDialog.Root>
                        </Flex>
                    )}

                    <Flex align="center" gap="1">
                        <Text size="1" color="gray">
                            Customise
                        </Text>
                        <Switch
                            size="1"
                            checked={editing}
                            onCheckedChange={setEditing}
                            aria-label="Toggle customise mode"
                        />
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
                                gap="0"
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
                                                style={{
                                                    ...dragProvided
                                                        .draggableProps.style,
                                                    marginBottom:
                                                        'var(--space-5)',
                                                }}
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
