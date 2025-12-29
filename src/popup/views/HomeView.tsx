import { ReactNode, useMemo, useState } from 'react';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DropResult,
} from '@hello-pangea/dnd';
import {
    DiscIcon,
    GridIcon,
    PlusIcon,
    PersonIcon,
    RowsIcon,
    StackIcon,
} from '@radix-ui/react-icons';
import {
    Button,
    DropdownMenu,
    Flex,
    IconButton,
    Text,
    Tooltip,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { MediaCard } from '../components/MediaCard';
import { MediaList } from '../components/MediaList';
import { MediaListItem } from '../components/MediaListItem';
import type { SearchFilter } from '../hooks/useSearch';

type SectionId = 'recents' | 'forYou' | 'playlists';

type SectionConfig = {
    id: SectionId;
    view: 'card' | 'list';
    limit: number;
};

const DEFAULT_SECTIONS: SectionConfig[] = [
    { id: 'recents', view: 'list', limit: 6 },
    { id: 'forYou', view: 'card', limit: 6 },
    { id: 'playlists', view: 'card', limit: 6 },
];

const RECENTS = [
    { title: 'Nightcall', subtitle: 'Kavinsky', icon: <DiscIcon /> },
    { title: 'Phoenix', subtitle: 'French indie', icon: <PersonIcon /> },
    { title: 'Midnight City', subtitle: 'M83', icon: <PersonIcon /> },
    { title: 'Glitter', subtitle: 'Benee', icon: <PersonIcon /> },
    { title: 'Heartbeats', subtitle: 'The Knife', icon: <PersonIcon /> },
    { title: 'Digital Love', subtitle: 'Daft Punk', icon: <PersonIcon /> },
    { title: 'Breezeblocks', subtitle: 'alt-J', icon: <PersonIcon /> },
    { title: 'Oblivion', subtitle: 'Grimes', icon: <PersonIcon /> },
];

const MADE_FOR_YOU = [
    {
        title: 'Daily Mix 1',
        subtitle: 'Chromatics, Desire, College',
        icon: <StackIcon />,
    },
    {
        title: 'Release Radar',
        subtitle: 'Fresh drops each Friday',
        icon: <StackIcon />,
    },
    {
        title: 'Retro Synthwave',
        subtitle: 'Night drive energy',
        icon: <StackIcon />,
    },
    {
        title: 'Indie Pulse',
        subtitle: 'Fresh indie finds',
        icon: <StackIcon />,
    },
    {
        title: 'Lo-Fi Lounge',
        subtitle: 'Beats to focus',
        icon: <StackIcon />,
    },
];

const PLAYLISTS = [
    {
        title: 'Indie Mornings',
        subtitle: 'Coffee and guitars',
        icon: <StackIcon />,
    },
    {
        title: 'Work Flow',
        subtitle: 'Instrumental focus',
        icon: <StackIcon />,
    },
    {
        title: 'Feel Good Friday',
        subtitle: 'Weekend starters',
        icon: <StackIcon />,
    },
    {
        title: 'Sunday Chill',
        subtitle: 'Slow afternoons',
        icon: <StackIcon />,
    },
    {
        title: 'Night Drive',
        subtitle: 'Synthwave cruise',
        icon: <StackIcon />,
    },
    {
        title: 'Deep House',
        subtitle: 'After hours',
        icon: <StackIcon />,
    },
];

const SECTION_META: Record<
    SectionId,
    {
        title: string;
        subtitle?: string;
        items: { title: string; subtitle?: string; icon: ReactNode }[];
    }
> = {
    recents: {
        title: 'Recently played',
        subtitle: 'Fresh from your history',
        items: RECENTS,
    },
    forYou: {
        title: 'Made for you',
        subtitle: 'Personalized mixes and blends',
        items: MADE_FOR_YOU,
    },
    playlists: {
        title: 'Your playlists',
        subtitle: 'Saved and created',
        items: PLAYLISTS,
    },
};

interface Props {
    searchQuery: string;
    filters: SearchFilter[];
}

export function HomeView({ searchQuery, filters }: Props) {
    const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
    const [editing, setEditing] = useState(false);

    const inactiveSections = useMemo(
        () =>
            (Object.keys(SECTION_META) as SectionId[]).filter(
                (id) => !sections.some((section) => section.id === id)
            ),
        [sections]
    );

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const next = [...sections];
        const [moved] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, moved);
        setSections(next);
    };

    const removeSection = (id: SectionId) =>
        setSections((prev) => prev.filter((item) => item.id !== id));
    const addSection = (id: SectionId) =>
        setSections((prev) =>
            prev.some((section) => section.id === id)
                ? prev
                : [...prev, { id, view: 'card', limit: 6 }]
        );
    const updateSection = (
        id: SectionId,
        patch: Partial<Omit<SectionConfig, 'id'>>
    ) =>
        setSections((prev) =>
            prev.map((section) =>
                section.id === id ? { ...section, ...patch } : section
            )
        );

    return (
        <Flex
            flexGrow="1"
            direction="column"
            gap="4"
            className="min-h-0 min-w-0 overflow-y-auto"
        >
            <Flex p="1" direction="column" gap="3" className="min-w-0">
                <Flex justify="end" align="center" gap="2">
                    {filters.length > 0 && (
                        <Tooltip
                            content={`Filters: ${filters
                                .map((f) => f.label)
                                .join(', ')}`}
                        >
                            <Text size="1" color="gray">
                                {filters.length} filter
                                {filters.length === 1 ? '' : 's'} active
                            </Text>
                        </Tooltip>
                    )}
                    {searchQuery.trim() && (
                        <Text size="1" color="gray">
                            Searching for “{searchQuery.trim()}”
                        </Text>
                    )}
                </Flex>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="sections">
                        {(dropProvided) => (
                            <Flex
                                direction="column"
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                            >
                                {sections.map((section, index) => {
                                    const meta = SECTION_META[section.id];
                                    const items = meta.items;
                                    return (
                                        <Draggable
                                            key={section.id}
                                            draggableId={section.id}
                                            index={index}
                                            isDragDisabled={!editing}
                                        >
                                            {(drag) => {
                                                const style =
                                                    drag.draggableProps.style;
                                                const transform =
                                                    style?.transform;
                                                let yLockedStyle = style;
                                                if (transform) {
                                                    const match =
                                                        transform.match(
                                                            /translate\([^,]+,\s*([^)]+)\)/
                                                        );
                                                    if (match?.[1]) {
                                                        yLockedStyle = {
                                                            ...style,
                                                            transform: `translate(0px, ${match[1]})`,
                                                        };
                                                    }
                                                }

                                                const sectionShellClasses =
                                                    clsx(
                                                        'min-w-0 relative rounded-lg p-1 m-1 bg-[var(--color-background)] ring-2 ring-transparent',
                                                        editing &&
                                                            'shadow-sm ring-[var(--accent-6)] hover:ring-[var(--accent-8)] transition-shadow'
                                                    );

                                                const inlineControls =
                                                    editing && (
                                                        <Flex
                                                            align="center"
                                                            className="pointer-events-auto absolute top-2 right-2 z-1 gap-1 rounded-full bg-[var(--color-panel-solid)] px-2 py-1 shadow-sm backdrop-blur"
                                                        >
                                                            <IconButton
                                                                size="1"
                                                                variant={
                                                                    section.view ===
                                                                    'card'
                                                                        ? 'soft'
                                                                        : 'ghost'
                                                                }
                                                                aria-label="Card layout"
                                                                onClick={() =>
                                                                    updateSection(
                                                                        section.id,
                                                                        {
                                                                            view: 'card',
                                                                        }
                                                                    )
                                                                }
                                                            >
                                                                <GridIcon />
                                                            </IconButton>
                                                            <IconButton
                                                                size="1"
                                                                variant={
                                                                    section.view ===
                                                                    'list'
                                                                        ? 'soft'
                                                                        : 'ghost'
                                                                }
                                                                aria-label="List layout"
                                                                onClick={() =>
                                                                    updateSection(
                                                                        section.id,
                                                                        {
                                                                            view: 'list',
                                                                        }
                                                                    )
                                                                }
                                                            >
                                                                <RowsIcon />
                                                            </IconButton>
                                                            {section.view ===
                                                                'list' && (
                                                                <DropdownMenu.Root>
                                                                    <DropdownMenu.Trigger>
                                                                        <Button
                                                                            size="1"
                                                                            variant="ghost"
                                                                        >
                                                                            Limit{' '}
                                                                            {
                                                                                section.limit
                                                                            }
                                                                        </Button>
                                                                    </DropdownMenu.Trigger>
                                                                    <DropdownMenu.Content
                                                                        size="1"
                                                                        align="end"
                                                                    >
                                                                        {[
                                                                            3,
                                                                            5,
                                                                            6,
                                                                            8,
                                                                            10,
                                                                        ].map(
                                                                            (
                                                                                value
                                                                            ) => (
                                                                                <DropdownMenu.Item
                                                                                    key={
                                                                                        value
                                                                                    }
                                                                                    onSelect={(
                                                                                        event
                                                                                    ) => {
                                                                                        event.preventDefault();
                                                                                        updateSection(
                                                                                            section.id,
                                                                                            {
                                                                                                limit: value,
                                                                                            }
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        value
                                                                                    }{' '}
                                                                                    rows
                                                                                </DropdownMenu.Item>
                                                                            )
                                                                        )}
                                                                    </DropdownMenu.Content>
                                                                </DropdownMenu.Root>
                                                            )}
                                                            <IconButton
                                                                size="1"
                                                                variant="ghost"
                                                                color="red"
                                                                radius="full"
                                                                aria-label="Hide section"
                                                                onClick={() =>
                                                                    removeSection(
                                                                        section.id
                                                                    )
                                                                }
                                                            >
                                                                ✕
                                                            </IconButton>
                                                        </Flex>
                                                    );

                                                return (
                                                    <Flex
                                                        direction="column"
                                                        gap="2"
                                                        className={
                                                            sectionShellClasses
                                                        }
                                                        ref={drag.innerRef}
                                                        style={yLockedStyle}
                                                        {...drag.draggableProps}
                                                        {...drag.dragHandleProps}
                                                    >
                                                        {inlineControls}
                                                        <Flex
                                                            direction="row"
                                                            align="baseline"
                                                            gap="2"
                                                        >
                                                            <Text
                                                                size="3"
                                                                weight="bold"
                                                            >
                                                                {meta.title}
                                                            </Text>
                                                            {meta.subtitle && (
                                                                <Text
                                                                    size="2"
                                                                    color="gray"
                                                                >
                                                                    {
                                                                        meta.subtitle
                                                                    }
                                                                </Text>
                                                            )}
                                                        </Flex>

                                                        <div
                                                            className={clsx(
                                                                editing &&
                                                                    'pointer-events-none select-none'
                                                            )}
                                                        >
                                                            {section.view ===
                                                            'card' ? (
                                                                <MediaList variant="card">
                                                                    {items.map(
                                                                        (
                                                                            item,
                                                                            itemIndex
                                                                        ) => (
                                                                            <MediaCard
                                                                                key={`${section.id}-${item.title}-${itemIndex}`}
                                                                                title={
                                                                                    item.title
                                                                                }
                                                                                subtitle={
                                                                                    item.subtitle
                                                                                }
                                                                                icon={
                                                                                    item.icon
                                                                                }
                                                                            />
                                                                        )
                                                                    )}
                                                                </MediaList>
                                                            ) : (
                                                                <MediaList
                                                                    variant="list"
                                                                    className="pr-1"
                                                                >
                                                                    {items.map(
                                                                        (
                                                                            item,
                                                                            itemIndex
                                                                        ) => (
                                                                            <MediaListItem
                                                                                key={`${section.id}-${item.title}-${itemIndex}`}
                                                                                title={
                                                                                    item.title
                                                                                }
                                                                                subtitle={
                                                                                    item.subtitle
                                                                                }
                                                                                icon={
                                                                                    item.icon
                                                                                }
                                                                            />
                                                                        )
                                                                    )}
                                                                </MediaList>
                                                            )}
                                                        </div>
                                                    </Flex>
                                                );
                                            }}
                                        </Draggable>
                                    );
                                })}
                                {dropProvided.placeholder}
                            </Flex>
                        )}
                    </Droppable>
                </DragDropContext>

                <Flex justify="end" align="center" gap="2" className="mt-1">
                    {editing ? (
                        <>
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <Button
                                        variant="soft"
                                        size="1"
                                        disabled={inactiveSections.length === 0}
                                        className="gap-2"
                                    >
                                        <PlusIcon />
                                        Add section
                                    </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content size="1" align="end">
                                    {inactiveSections.length === 0 && (
                                        <DropdownMenu.Item disabled>
                                            All sections visible
                                        </DropdownMenu.Item>
                                    )}
                                    {inactiveSections.map((id) => (
                                        <DropdownMenu.Item
                                            key={id}
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                addSection(id);
                                            }}
                                        >
                                            {SECTION_META[id].title}
                                        </DropdownMenu.Item>
                                    ))}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button
                                size="1"
                                variant="ghost"
                                onClick={() => setSections(DEFAULT_SECTIONS)}
                            >
                                Reset
                            </Button>
                            <Button
                                size="1"
                                variant="solid"
                                onClick={() => setEditing(false)}
                            >
                                Done
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="ghost"
                            size="1"
                            onClick={() => setEditing(true)}
                        >
                            Customize
                        </Button>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
}
