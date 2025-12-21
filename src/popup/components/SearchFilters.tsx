import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import {
    SearchFilters as Filters,
    SearchType,
} from '../hooks/useSpotifySearch';

const TYPE_LABELS: Record<SearchType, string> = {
    track: 'Tracks',
    artist: 'Artists',
    album: 'Albums',
    playlist: 'Playlists',
    show: 'Shows',
    episode: 'Episodes',
};

interface Props {
    types: SearchType[];
    availableTypes: SearchType[];
    filters: Filters;
    onTypesChange: (types: SearchType[]) => void;
    onFiltersChange: (next: Filters) => void;
    onClearFilters: () => void;
}

export function SearchFilters({
    types,
    availableTypes,
    filters,
    onTypesChange,
    onFiltersChange,
    onClearFilters,
}: Props) {
    const isAllSelected = types.length === availableTypes.length;

    const toggleType = (type: SearchType) => {
        const next = new Set(types);
        if (next.has(type)) next.delete(type);
        else next.add(type);

        const resolved = next.size === 0 ? availableTypes : Array.from(next);
        const ordered = availableTypes.filter((value) =>
            resolved.includes(value)
        );
        onTypesChange(ordered);
    };

    const inputClassName = 'min-w-[140px]';

    return (
        <Flex direction="column" gap="2">
            <Flex direction="column" gap="2">
                <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="uppercase"
                >
                    Categories
                </Text>
                <Flex wrap="wrap" gap="2">
                    <Button
                        size="1"
                        variant={isAllSelected ? 'solid' : 'outline'}
                        color={isAllSelected ? undefined : 'gray'}
                        onClick={() => onTypesChange(availableTypes)}
                    >
                        All
                    </Button>
                    {availableTypes.map((type) => {
                        const active = types.includes(type);
                        return (
                            <Button
                                key={type}
                                size="1"
                                variant={active ? 'solid' : 'outline'}
                                color={active ? undefined : 'gray'}
                                onClick={() => toggleType(type)}
                            >
                                {TYPE_LABELS[type]}
                            </Button>
                        );
                    })}
                </Flex>
            </Flex>

            <Flex direction="column" gap="2">
                <Text
                    size="1"
                    weight="medium"
                    color="gray"
                    className="uppercase"
                >
                    Advanced filters
                </Text>
                <Flex wrap="wrap" gap="2">
                    <TextField.Root
                        className={inputClassName}
                        size="1"
                        radius="full"
                        placeholder="Artist"
                        value={filters.artist ?? ''}
                        onChange={(event) =>
                            onFiltersChange({
                                ...filters,
                                artist: event.target.value,
                            })
                        }
                    />
                    <TextField.Root
                        className={inputClassName}
                        size="1"
                        radius="full"
                        placeholder="Album"
                        value={filters.album ?? ''}
                        onChange={(event) =>
                            onFiltersChange({
                                ...filters,
                                album: event.target.value,
                            })
                        }
                    />
                    <TextField.Root
                        className={inputClassName}
                        size="1"
                        radius="full"
                        placeholder="Year"
                        value={filters.year ?? ''}
                        onChange={(event) =>
                            onFiltersChange({
                                ...filters,
                                year: event.target.value,
                            })
                        }
                    />
                    <TextField.Root
                        className={inputClassName}
                        size="1"
                        radius="full"
                        placeholder="Genre"
                        value={filters.genre ?? ''}
                        onChange={(event) =>
                            onFiltersChange({
                                ...filters,
                                genre: event.target.value,
                            })
                        }
                    />
                    <Button size="1" variant="soft" onClick={onClearFilters}>
                        Clear filters
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}
