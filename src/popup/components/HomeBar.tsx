import { ReactNode } from 'react';
import {
    Cross2Icon,
    ChevronLeftIcon,
    HomeIcon,
    MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Flex, IconButton, TextField } from '@radix-ui/themes';
import clsx from 'clsx';

interface Props {
    profileSlot?: ReactNode;
    navSlot?: ReactNode;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
    onSearchSubmit?: () => void;
    canGoBack?: boolean;
    onGoBack?: () => void;
    searchOptionsSlot?: ReactNode;
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
    searchOptionsSlot,
}: Props) {
    const hasQuery = searchQuery.trim().length > 0;

    return (
        <Flex direction="column" gap="2" p="2" flexGrow="1">
            <Flex align="center" gap="2">
                <IconButton
                    size="1"
                    variant="ghost"
                    radius="full"
                    disabled={!canGoBack}
                    aria-label="Go back"
                    onClick={onGoBack}
                >
                    <ChevronLeftIcon />
                </IconButton>
                <TextField.Root
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onSearchSubmit?.();
                        }
                    }}
                    size="2"
                    radius="full"
                    placeholder="Search Spotify"
                    className="flex grow items-center px-3"
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

                {profileSlot}

                {navSlot}
            </Flex>
            {searchOptionsSlot}
        </Flex>
    );
}
