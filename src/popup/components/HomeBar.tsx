import { ReactNode, useState } from 'react';
import {
    Cross2Icon,
    ChevronLeftIcon,
    HomeIcon,
    MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, TextField, Text, Button } from '@radix-ui/themes';
import clsx from 'clsx';

import { Pill, type PillValue } from './Pill';

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
    onSearchSubmit?: () => void;
    canGoBack?: boolean;
    onGoBack?: () => void;
}

export function HomeBar({
    profileSlot,
    navSlot,
    searchQuery,
    onSearchChange,
    onClearSearch,
    onSearchSubmit,
    canGoBack,
    onGoBack,
}: Props) {
    const hasQuery = searchQuery.trim().length > 0;
    const [mockArtist, setMockArtist] = useState<PillValue | null>({
        type: 'text',
        value: 'Chromatics',
    });
    const [mockMood, setMockMood] = useState<PillValue | null>({
        type: 'text',
        value: 'Chillwave',
    });
    const [mockMediaType, setMockMediaType] = useState<PillValue | null>({
        type: 'options',
        options: ['Track', 'Album', 'Artist', 'Playlist'],
        value: ['Track', 'Artist'],
    });
    const [mockDate, setMockDate] = useState<PillValue | null>({
        type: 'date',
        value: '2024-02-14',
    });
    const [mockRange, setMockRange] = useState<PillValue | null>({
        type: 'date-range',
        value: { from: '2024-01-01', to: '2024-12-31' },
    });

    return (
        <Flex direction="column" gap="2" p="2" flexGrow="1">
            <Flex align="start" gap="2">
                <Flex direction="column" gap="1" className="w-full">
                    <Flex align="center" gap="1" className="w-full">
                        <IconButton
                            size="1"
                            variant="ghost"
                            radius="full"
                            disabled={!canGoBack}
                            aria-label="Go back"
                            onClick={onGoBack}
                            className="mt-0.5 h-6 !w-4 !p-0"
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                        <TextField.Root
                            value={searchQuery}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    onSearchSubmit?.();
                                }
                            }}
                            size="2"
                            radius="full"
                            placeholder="Find your groove"
                            className="w-full min-w-0 flex-1"
                        >
                            <TextField.Slot side="left" pr="1">
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    aria-label="Search"
                                    onClick={() => onSearchSubmit?.()}
                                >
                                    <MagnifyingGlassIcon
                                        className={clsx(
                                            'absolute transition-transform ease-out',
                                            hasQuery
                                                ? 'scale-100 opacity-100'
                                                : 'scale-50 opacity-0'
                                        )}
                                    />
                                    <HomeIcon
                                        className={clsx(
                                            'absolute transition-transform ease-out',
                                            hasQuery
                                                ? 'scale-50 opacity-0'
                                                : 'scale-100 opacity-100'
                                        )}
                                    />
                                </IconButton>
                            </TextField.Slot>
                            <TextField.Slot side="right" pl="1">
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    aria-label="Clear search"
                                    aria-hidden={!hasQuery}
                                    tabIndex={!hasQuery ? -1 : 0}
                                    onClick={onClearSearch}
                                    className={clsx(
                                        '!transition-transform',
                                        hasQuery ? '!scale-100' : '!scale-0'
                                    )}
                                >
                                    <Cross2Icon />
                                </IconButton>
                            </TextField.Slot>
                        </TextField.Root>
                    </Flex>
                    <Flex justify="between">
                        {/* TODO: Integrate into search filters */}
                        <Text size="2" weight="medium">
                            Search Filters
                        </Text>
                        <Button size="0" variant="soft">
                            Clear All
                        </Button>
                    </Flex>
                </Flex>

                {(profileSlot || navSlot) && (
                    <Flex align="center" gap="2">
                        {profileSlot}
                        {navSlot}
                    </Flex>
                )}
            </Flex>
            <Flex align="center" gap="2" className="min-w-0 flex-wrap">
                {/* TODO: Create actual search filters and add a plus button with a dropdown of available options */}
                {/* TODO: Why does the pills sometimes result in the app being expanded, I dont know why this is happening (related to todo in media list) */}
                {!!mockArtist && (
                    <Pill
                        label="Artist"
                        value={mockArtist}
                        placeholder="Add an artist"
                        onChange={setMockArtist}
                        onRemove={() => setMockArtist(null)}
                    />
                )}
                {!!mockMood && (
                    <Pill
                        label="Mood"
                        value={mockMood}
                        placeholder="Set mood"
                        onChange={setMockMood}
                        onRemove={() => setMockMood(null)}
                    />
                )}
                {!!mockMediaType && (
                    <Pill
                        label="Type"
                        value={mockMediaType}
                        placeholder="Select categories"
                        onChange={setMockMediaType}
                        onRemove={() => setMockMediaType(null)}
                    />
                )}
                {mockDate && (
                    <Pill
                        label="Date"
                        value={mockDate}
                        placeholder="Select date"
                        onChange={setMockDate}
                        onRemove={() => setMockDate(null)}
                    />
                )}
                {mockRange && (
                    <Pill
                        label="Range"
                        value={mockRange}
                        placeholder="Select range"
                        onChange={setMockRange}
                        onRemove={() => setMockRange(null)}
                    />
                )}
            </Flex>
        </Flex>
    );
}
