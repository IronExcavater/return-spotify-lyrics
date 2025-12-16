import { ReactNode } from 'react';
import {
    Cross2Icon,
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
}

export function HomeBar({
    profileSlot,
    navSlot,
    searchQuery,
    onSearchChange,
    onClearSearch,
}: Props) {
    const hasQuery = searchQuery.trim().length > 0;

    return (
        <Flex align="center" gap="2" p="2" flexGrow="1">
            <TextField.Root
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                size="2"
                radius="full"
                placeholder="Find your groove"
                className="flex grow items-center px-3"
            >
                <TextField.Slot side="left" pr="1">
                    <IconButton
                        disabled
                        size="1"
                        variant="ghost"
                        className="relative flex !cursor-default items-center justify-center"
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
    );
}
