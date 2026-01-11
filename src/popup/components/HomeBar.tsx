import { ReactNode } from 'react';
import {
    Cross2Icon,
    ChevronLeftIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from '@radix-ui/react-icons';
import {
    Button,
    DropdownMenu,
    Flex,
    IconButton,
    Text,
    TextField,
} from '@radix-ui/themes';
import clsx from 'clsx';

import type { FilterKind, SearchFilter } from '../hooks/useSearch';
import { Pill, type PillValue } from './Pill';

const FILTER_LABELS: Record<FilterKind, string> = {
    artist: 'Artist',
    genre: 'Genre',
    category: 'Category',
    year: 'Released',
};

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
    onSearchSubmit?: () => void;
    canGoBack?: boolean;
    onGoBack?: () => void;
    filters: SearchFilter[];
    availableFilters: FilterKind[];
    onAddFilter: (kind: FilterKind) => void;
    onUpdateFilter: (id: string, value: PillValue) => void;
    onRemoveFilter: (id: string) => void;
    onClearFilters: () => void;
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
    filters,
    availableFilters,
    onAddFilter,
    onUpdateFilter,
    onRemoveFilter,
    onClearFilters,
}: Props) {
    const hasQuery = searchQuery.trim().length > 0;

    return (
        <Flex direction="column" p="2" flexGrow="1" className="w-full min-w-0">
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
                    <Flex align="center" justify="between">
                        <Text size="2" weight="medium">
                            Search Filters
                        </Text>
                        <Flex gap="1">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <IconButton
                                        size="1"
                                        variant="soft"
                                        radius="full"
                                        disabled={availableFilters.length === 0}
                                    >
                                        <PlusIcon />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content size="1">
                                    {availableFilters.length === 0 && (
                                        <DropdownMenu.Item disabled>
                                            All filters added
                                        </DropdownMenu.Item>
                                    )}
                                    {availableFilters.map((kind) => (
                                        <DropdownMenu.Item
                                            key={kind}
                                            onSelect={(event) => {
                                                event.preventDefault();
                                                onAddFilter(kind);
                                            }}
                                        >
                                            {FILTER_LABELS[kind]}
                                        </DropdownMenu.Item>
                                    ))}
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                            <Button
                                size="1"
                                variant="soft"
                                onClick={onClearFilters}
                                disabled={filters.length === 0}
                            >
                                Clear All
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>

                {(profileSlot || navSlot) && (
                    <Flex align="center" gap="2">
                        {profileSlot}
                        {navSlot}
                    </Flex>
                )}
            </Flex>
            <Flex
                align="center"
                gap="2"
                pt={filters.length > 0 && '2'}
                className="flex-wrap"
            >
                {filters.map((filter) => (
                    <Pill
                        key={filter.id}
                        label={filter.label}
                        value={filter.value}
                        dateGranularity={
                            filter.kind === 'year' ? 'year' : undefined
                        }
                        placeholder={
                            filter.kind === 'artist'
                                ? 'Name'
                                : filter.kind === 'genre'
                                  ? 'Tag'
                                  : filter.kind === 'category'
                                    ? 'Pick'
                                    : 'YYYY'
                        }
                        onChange={(value) =>
                            onUpdateFilter(filter.id, value as PillValue)
                        }
                        onRemove={() => onRemoveFilter(filter.id)}
                    />
                ))}
            </Flex>
        </Flex>
    );
}
