import { Flex, IconButton, TextField } from '@radix-ui/themes';
import {
    Cross2Icon,
    HomeIcon,
    MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { ReactNode } from 'react';

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
                placeholder="Search controls or tweaks"
                className="flex grow bg-[var(--gray-a3)] transition-colors duration-150 focus-within:bg-[var(--gray-a4)]"
            >
                <TextField.Slot
                    side="left"
                    className="text-[var(--accent-11)] transition-all duration-200"
                >
                    <span
                        className={`inline-flex items-center transition-all duration-200 ${
                            hasQuery
                                ? 'scale-100 text-[var(--accent-12)]'
                                : 'scale-95 opacity-80'
                        }`}
                    >
                        {hasQuery ? <MagnifyingGlassIcon /> : <HomeIcon />}
                    </span>
                </TextField.Slot>
                {hasQuery && (
                    <TextField.Slot side="right">
                        <IconButton
                            type="button"
                            size="1"
                            variant="ghost"
                            aria-label="Clear search"
                            onClick={onClearSearch}
                            className="transition-transform duration-150 hover:scale-110"
                        >
                            <Cross2Icon />
                        </IconButton>
                    </TextField.Slot>
                )}
            </TextField.Root>

            {profileSlot}

            {navSlot}
        </Flex>
    );
}
