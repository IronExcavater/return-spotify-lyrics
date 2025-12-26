import { useMemo, useState } from 'react';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { Button, DropdownMenu, Flex, IconButton, Text } from '@radix-ui/themes';
import {
    SearchFilters as Filters,
    SearchType,
} from '../hooks/useSpotifySearch';
import { FilterPill } from './FilterPill';

const TYPE_LABELS: Record<SearchType, string> = {
    track: 'Tracks',
    artist: 'Artists',
    album: 'Albums',
    playlist: 'Playlists',
    show: 'Shows',
    episode: 'Episodes',
};

const FILTER_DEFS = [
    { key: 'category', label: 'Category' },
    { key: 'artist', label: 'Artist', placeholder: 'Artist' },
    { key: 'album', label: 'Album', placeholder: 'Album' },
    { key: 'year', label: 'Year', placeholder: 'Year' },
    { key: 'genre', label: 'Genre', placeholder: 'Genre' },
] as const;

type FilterKey = (typeof FILTER_DEFS)[number]['key'];
type TextFilterKey = Exclude<FilterKey, 'category'>;
type TextFilterDef = (typeof FILTER_DEFS)[number] & { key: TextFilterKey };

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
    const [editingKey, setEditingKey] = useState<FilterKey | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [categoryOpen, setCategoryOpen] = useState(false);

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

    const categoryValue = useMemo(() => {
        if (isAllSelected || types.length === 0) return 'All';
        const labels = availableTypes
            .filter((type) => types.includes(type))
            .map((type) => TYPE_LABELS[type]);
        if (labels.length <= 2) return labels.join(', ');
        return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
    }, [availableTypes, isAllSelected, types]);

    const showCategory = !isAllSelected || categoryOpen;
    const textFilterDefs = FILTER_DEFS.filter(
        (filter): filter is TextFilterDef => filter.key !== 'category'
    );

    const activeTextFilters = textFilterDefs.filter((filter) => {
        const value = filters[filter.key] ?? '';
        return Boolean(value.trim()) || editingKey === filter.key;
    });

    const openEditor = (key: FilterKey) => {
        if (key === 'category') {
            setCategoryOpen(true);
            return;
        }
        setEditingKey(key);
        setEditingValue(filters[key] ?? '');
    };

    const closeEditor = () => {
        setEditingKey(null);
        setEditingValue('');
    };

    const updateFilter = (key: FilterKey, value: string) => {
        if (key === 'category') return;
        const next = {
            ...filters,
            [key]: value,
        } as Filters;
        onFiltersChange(next);
    };

    const handleClearFilters = () => {
        onClearFilters();
        onTypesChange(availableTypes);
        setCategoryOpen(false);
        closeEditor();
    };

    const clearFilter = (key: FilterKey) => {
        if (key === 'category') {
            onTypesChange(availableTypes);
            setCategoryOpen(false);
            if (editingKey === key) closeEditor();
            return;
        }
        updateFilter(key, '');
        if (editingKey === key) closeEditor();
    };

    const handleEditorChange = (value: string) => {
        setEditingValue(value);
        if (editingKey && editingKey !== 'category') {
            updateFilter(editingKey, value);
        }
    };

    const availableTextFilters = textFilterDefs.filter((filter) => {
        const value = filters[filter.key] ?? '';
        return !value.trim() && editingKey !== filter.key;
    });

    const availableFilterDefs: Array<(typeof FILTER_DEFS)[number]> = [];
    if (!showCategory) {
        availableFilterDefs.push(FILTER_DEFS[0]);
    }
    availableFilterDefs.push(...availableTextFilters);

    return (
        <Flex direction="column" gap="3" className="px-4 py-2">
            <Flex align="center" gap="3" wrap="wrap">
                {showCategory && (
                    <FilterPill className="max-w-full">
                        <Text size="1" weight="medium" className="text-white">
                            Category
                        </Text>
                        <DropdownMenu.Root
                            open={categoryOpen}
                            onOpenChange={(open) => {
                                setCategoryOpen(open);
                            }}
                        >
                            <DropdownMenu.Trigger>
                                <Button
                                    size="1"
                                    variant="ghost"
                                    className="h-5 max-w-[120px] truncate px-1 text-[10px]"
                                >
                                    {categoryValue}
                                </Button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content size="1" variant="soft">
                                {availableTypes.map((type) => (
                                    <DropdownMenu.CheckboxItem
                                        key={type}
                                        checked={types.includes(type)}
                                        onCheckedChange={() => toggleType(type)}
                                    >
                                        {TYPE_LABELS[type]}
                                    </DropdownMenu.CheckboxItem>
                                ))}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                        <Button
                            size="1"
                            variant="ghost"
                            aria-label="Remove category filter"
                            className="!h-4 !w-4 !p-0"
                            onClick={() => clearFilter('category')}
                        >
                            <Cross2Icon />
                        </Button>
                    </FilterPill>
                )}

                {activeTextFilters
                    .filter((filter) => filter.key !== editingKey)
                    .map((filter) => (
                        <FilterPill
                            key={filter.key}
                            onClick={() => openEditor(filter.key)}
                            interactive
                        >
                            <Text
                                size="1"
                                weight="medium"
                                className="text-white"
                            >
                                {filter.label}
                            </Text>
                            <Text
                                size="1"
                                color="gray"
                                className="max-w-[90px] truncate"
                            >
                                {filters[filter.key]}
                            </Text>
                            <Button
                                size="1"
                                variant="ghost"
                                aria-label={`Remove ${filter.label} filter`}
                                className="!h-4 !w-4 !p-0"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    clearFilter(filter.key);
                                }}
                            >
                                <Cross2Icon />
                            </Button>
                        </FilterPill>
                    ))}

                {editingKey && editingKey !== 'category' && (
                    <FilterPill>
                        <Text size="1" weight="medium" className="text-white">
                            {
                                FILTER_DEFS.find(
                                    (filter) => filter.key === editingKey
                                )?.label
                            }
                        </Text>
                        <input
                            value={editingValue}
                            onChange={(event) =>
                                handleEditorChange(event.target.value)
                            }
                            onBlur={() => {
                                if (!editingValue.trim()) {
                                    clearFilter(editingKey);
                                    return;
                                }
                                closeEditor();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    if (!editingValue.trim()) {
                                        clearFilter(editingKey);
                                        return;
                                    }
                                    closeEditor();
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    closeEditor();
                                }
                            }}
                            placeholder={
                                FILTER_DEFS.find(
                                    (filter) => filter.key === editingKey
                                )?.placeholder
                            }
                            className="w-28 bg-transparent text-[11px] text-white outline-none placeholder:text-[var(--gray-a9)]"
                            autoFocus
                        />
                        <Button
                            size="1"
                            variant="ghost"
                            aria-label="Remove filter"
                            className="!h-4 !w-4 !p-0"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => clearFilter(editingKey)}
                        >
                            <Cross2Icon />
                        </Button>
                    </FilterPill>
                )}

                {availableFilterDefs.length > 0 && (
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                            <IconButton
                                size="1"
                                variant="soft"
                                radius="full"
                                aria-label="Add filter"
                            >
                                <PlusIcon />
                            </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content size="1" variant="soft">
                            {availableFilterDefs.map((filter) => (
                                <DropdownMenu.Item
                                    key={filter.key}
                                    onSelect={() => openEditor(filter.key)}
                                >
                                    {filter.label}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                )}

                {(activeTextFilters.length > 0 || showCategory) && (
                    <Button
                        size="1"
                        variant="ghost"
                        onClick={handleClearFilters}
                    >
                        Clear
                    </Button>
                )}
            </Flex>
        </Flex>
    );
}
