import { useCallback, useEffect, useRef, useState } from 'react';
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
    Switch,
    Button,
    IconButton,
    AlertDialog,
} from '@radix-ui/themes';
import clsx from 'clsx';

import {
    MediaSection,
    type MediaSectionState,
} from '../components/MediaSection';
import type { MediaShelfItem } from '../components/MediaShelf';
import { usePersonalisation } from '../hooks/usePersonalisation';
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

export function HomeView({ searchQuery, filters }: Props) {
    const [sections, setSections] =
        useState<MediaSectionState[]>(INITIAL_SECTIONS);
    const [editing, setEditing] = useState(false);
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const { heading } = usePersonalisation({ searchQuery, filters });

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

    const addSection = useCallback(() => {
        const id =
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? `sec-${crypto.randomUUID()}`
                : `sec-${Date.now()}`;
        const nextSection: MediaSectionState = {
            id,
            title: 'New list',
            subtitle: 'Custom section',
            variant: 'list',
            orientation: 'vertical',
            rows: 10,
            maxVisible: 10,
            clampUnit: 'items',
            items: makeItems(id, 1, 12, 'Item', 'Artist'),
            hasMore: true,
            loadingMore: false,
        };
        setSections((prev) => [...prev, nextSection]);
        setLastAddedId(id);
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

    useEffect(() => {
        if (!lastAddedId) return;

        const raf = requestAnimationFrame(() => {
            const node = sectionRefs.current.get(lastAddedId);
            if (node) {
                node.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setLastAddedId(null);
            }
        });

        return () => cancelAnimationFrame(raf);
    }, [lastAddedId]);

    return (
        <Flex
            flexGrow="1"
            direction="column"
            className="no-overflow-anchor min-h-0 min-w-0 overflow-y-auto"
            ref={scrollContainerRef}
        >
            <Flex px="3" py="2" direction="column" gap="1" className="min-w-0">
                <Flex
                    align="center"
                    justify="between"
                    gap="3"
                    className={clsx(
                        'relative min-w-0 py-1',
                        editing &&
                            'sticky top-0 z-20 mt-[10px] mb-[10px] bg-[var(--color-background)]'
                    )}
                >
                    {!editing && (
                        <Flex direction="column" align="start" gap="1">
                            <Text
                                size="3"
                                weight="bold"
                                className="leading-none"
                            >
                                {heading.title}
                            </Text>
                            <Text
                                size="1"
                                color="gray"
                                className="leading-tight"
                            >
                                {heading.subtitle}
                            </Text>
                        </Flex>
                    )}

                    {editing && (
                        <Flex align="center" gap="2" className="relative">
                            <IconButton
                                size="1"
                                variant="soft"
                                color="green"
                                radius="full"
                                onClick={addSection}
                                aria-label="Add section"
                            >
                                <PlusIcon />
                            </IconButton>

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

                    {editing && (
                        <div className="pointer-events-none absolute top-full right-0 left-0 z-0 h-4 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                    )}
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
                                                ref={(node) => {
                                                    dragProvided.innerRef(node);
                                                    if (node)
                                                        sectionRefs.current.set(
                                                            section.id,
                                                            node
                                                        );
                                                    else
                                                        sectionRefs.current.delete(
                                                            section.id
                                                        );
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
                                                    dragging={
                                                        dragSnapshot.isDragging
                                                    }
                                                    onChange={updateSection}
                                                    onDelete={removeSection}
                                                    onReorderItems={updateItems}
                                                    onLoadMore={loadMore}
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
