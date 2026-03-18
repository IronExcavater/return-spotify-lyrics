import { ReactNode, type Ref } from 'react';
import {
    Cross2Icon,
    HomeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import type { FilterKind, SearchFilter, PillValue } from '../../shared/types';
import { handleMenuTriggerKeyDown } from '../hooks/useActions';
import { useScrollFade } from '../hooks/useScrollFade';
import { BackButton } from './BackButton';
import { Pill } from './Pill';
import { SearchBar } from './SearchBar';

const FILTER_LABELS: Record<FilterKind, string> = {
    artist: 'Artist',
    genre: 'Genre',
    type: 'Type',
    year: 'Released',
};

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
    onSearchSubmit?: () => void;
    searchInputRef?: Ref<HTMLInputElement>;
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
    searchInputRef,
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
    const hasFilters = filters.length > 0;
    const { scrollRef: filterScrollRef, fade: filterFade } = useScrollFade(
        'horizontal',
        [filters.length]
    );

    return (
        <Flex
            direction="column"
            p="2"
            gap="1"
            flexGrow="1"
            className="w-full min-w-0"
        >
            <Flex align="start" gap="2">
                <Flex direction="column" gap="1" className="w-full">
                    <Flex align="center" gap="1" className="w-full">
                        <BackButton disabled={!canGoBack} onClick={onGoBack} />
                        <SearchBar
                            value={searchQuery}
                            onChange={onSearchChange}
                            onSubmit={onSearchSubmit}
                            onClear={onClearSearch}
                            placeholder="Find your groove"
                            className="w-full min-w-0"
                            inputRef={searchInputRef}
                            showShortcut
                            leftSlot={
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    aria-label="Search"
                                    onClick={() => onSearchSubmit?.()}
                                >
                                    <MagnifyingGlassIcon
                                        className={clsx(
                                            'absolute transition-transform',
                                            hasQuery
                                                ? 'scale-100 opacity-100'
                                                : 'scale-50 opacity-0'
                                        )}
                                    />
                                    <HomeIcon
                                        className={clsx(
                                            'absolute transition-transform',
                                            hasQuery
                                                ? 'scale-50 opacity-0'
                                                : 'scale-100 opacity-100'
                                        )}
                                    />
                                </IconButton>
                            }
                            rightSlot={
                                <IconButton
                                    size="1"
                                    variant="ghost"
                                    aria-label="Clear search"
                                    aria-hidden={!hasQuery}
                                    tabIndex={!hasQuery ? -1 : 0}
                                    onClick={onClearSearch}
                                    className={clsx(
                                        'transition-transform!',
                                        hasQuery ? 'scale-100!' : 'scale-0!'
                                    )}
                                >
                                    <Cross2Icon />
                                </IconButton>
                            }
                        />
                    </Flex>
                    <Flex align="center" justify="between">
                        <Text size="2" weight="medium" className="self-end">
                            Search Filters
                        </Text>
                        <Flex gap="1">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger
                                    onKeyDown={handleMenuTriggerKeyDown}
                                >
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
                        {profileSlot} {navSlot}
                    </Flex>
                )}
            </Flex>
            {hasFilters && (
                <div className="relative">
                    <Flex
                        ref={filterScrollRef}
                        align="center"
                        direction="row"
                        overflowX="auto"
                        gap="2"
                        wrap="nowrap"
                        className="no-overflow-anchor scrollbar-hide p-0.5"
                    >
                        {filters.map((filter) => (
                            <div key={filter.id}>
                                <Pill
                                    label={filter.label}
                                    value={filter.value}
                                    dateGranularity={
                                        filter.kind === 'year'
                                            ? 'year'
                                            : undefined
                                    }
                                    placeholder={
                                        filter.kind === 'artist'
                                            ? 'Name'
                                            : filter.kind === 'genre'
                                              ? 'Tag'
                                              : filter.kind === 'type'
                                                ? 'Select'
                                                : 'YYYY'
                                    }
                                    onChange={(value) =>
                                        onUpdateFilter(
                                            filter.id,
                                            value as PillValue
                                        )
                                    }
                                    onRemove={() => onRemoveFilter(filter.id)}
                                />
                            </div>
                        ))}
                    </Flex>
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-2 left-0 h-[calc(100%-0.5rem)] w-2 bg-linear-to-r to-transparent transition-opacity',
                            filterFade.start ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                    <div
                        className={clsx(
                            'from-background via-background/60 pointer-events-none absolute top-2 right-0 h-[calc(100%-0.5rem)] w-2 bg-linear-to-l to-transparent transition-opacity',
                            filterFade.end ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                    />
                </div>
            )}
        </Flex>
    );
}
