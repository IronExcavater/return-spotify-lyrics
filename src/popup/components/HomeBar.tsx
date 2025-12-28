import { ReactNode, useState } from 'react';
import {
    Cross2Icon,
    ChevronLeftIcon,
    HomeIcon,
    MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, TextField } from '@radix-ui/themes';
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

    return (
        <Flex direction="column" gap="2" p="2" flexGrow="1">
            <Flex align="start" gap="2">
                <Flex align="start" gap="2" direction="column">
                    <Flex align="center" gap="2">
                        <IconButton
                            size="1"
                            variant="ghost"
                            radius="small"
                            disabled={!canGoBack}
                            aria-label="Go back"
                            onClick={onGoBack}
                            className="mt-[2px] h-6 !w-4 !p-0"
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
                            className="flex w-full items-center px-3"
                        >
                            <TextField.Slot side="left" pr="1">
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    aria-label="Search"
                                    className="relative flex items-center justify-center"
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
                    <Flex align="center" gap="2" className="min-w-0 flex-wrap">
                        <Pill
                            label="Artist"
                            value={mockArtist}
                            placeholder="Add an artist"
                            onChange={setMockArtist}
                            onRemove={() => setMockArtist(null)}
                        />
                        <Pill
                            label="Mood"
                            value={mockMood}
                            placeholder="Set mood"
                            onChange={setMockMood}
                            onRemove={() => setMockMood(null)}
                        />
                    </Flex>
                </Flex>

                {(profileSlot || navSlot) && (
                    <Flex align="center" gap="2">
                        {profileSlot}
                        {navSlot}
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
}
