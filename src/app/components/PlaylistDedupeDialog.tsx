import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Flex, Text } from '@radix-ui/themes';
import type {
    PlaylistDedupableItem,
    PlaylistDuplicateAnalysis,
    PlaylistDuplicateGroup,
} from '../utils/playlistDuplicates';
import { FullPageDialog } from './FullPageDialog';
import { MediaGroupShelf, type MediaGroupShelfGroup } from './MediaGroupShelf';
import { MediaRow } from './MediaRow';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    analysis: PlaylistDuplicateAnalysis | null;
    loading?: boolean;
    removing?: boolean;
    onConfirm: (items: PlaylistDedupableItem[]) => void;
};

function getGroupCheckedState(
    group: PlaylistDuplicateGroup,
    selectedIds: Set<string>
) {
    const selectedCount = group.itemIds.filter((itemId) =>
        selectedIds.has(itemId)
    ).length;
    if (selectedCount === 0) return false;
    if (selectedCount === group.itemIds.length) return true;
    return 'indeterminate' as const;
}

function DuplicateTrackRow({
    item,
    selected,
    onToggle,
}: {
    item: PlaylistDedupableItem;
    selected: boolean;
    onToggle: (checked: boolean) => void;
}) {
    return (
        <MediaRow
            title={item.title}
            subtitle={item.subtitle}
            imageUrl={item.imageUrl}
            icon={item.icon}
            onClick={() => onToggle(!selected)}
            showPosition
            position={item.playlistIndex}
            selection={{
                checked: selected,
                onCheckedChange: onToggle,
            }}
            className="px-1.5 py-1"
        />
    );
}

function EmptyState({ trackCount }: { trackCount: number }) {
    return (
        <div className="rounded-3 bg-background p-1">
            <Flex direction="column" align="center" gap="1" px="3" py="5">
                <Text size="2" weight="medium">
                    Playlist is clean
                </Text>
                <Text size="1" color="gray">
                    No duplicate groups found across {trackCount} tracks.
                </Text>
            </Flex>
        </div>
    );
}

export function PlaylistDedupeDialog({
    open,
    onOpenChange,
    analysis,
    loading = false,
    removing = false,
    onConfirm,
}: Props) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
        new Set()
    );

    const groups = analysis?.groups ?? [];
    const totalGroupCount = groups.length;
    const totalTrackCount = analysis?.entries.length ?? 0;

    useEffect(() => {
        if (!open) return;
        if (analysis) setSelectedIds(new Set(analysis.initialSelectedIds));
        setCollapsedGroups(new Set());
    }, [analysis, open]);

    const selectedItems = useMemo(() => {
        if (!analysis) return [];
        return Array.from(selectedIds)
            .map((itemId) => analysis.entriesById[itemId]?.item)
            .filter((item): item is PlaylistDedupableItem => Boolean(item))
            .sort((left, right) => left.playlistIndex - right.playlistIndex);
    }, [analysis, selectedIds]);

    const toggleItem = (itemId: string, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(itemId);
            else next.delete(itemId);
            return next;
        });
    };

    const toggleGroup = (group: PlaylistDuplicateGroup, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            group.itemIds.forEach((itemId) => {
                if (checked) next.add(itemId);
                else next.delete(itemId);
            });
            return next;
        });
    };

    const selectSuggested = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            groups.forEach((group) =>
                group.suggestedItemIds.forEach((itemId) => next.add(itemId))
            );
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            groups.forEach((group) =>
                group.itemIds.forEach((itemId) => next.delete(itemId))
            );
            return next;
        });
    };

    const toggleCollapsedGroup = (groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const shelfGroups = useMemo<MediaGroupShelfGroup[]>(() => {
        if (!analysis) return [];

        return groups.map((group) => ({
            id: group.id,
            title: group.title,
            subtitle: `${group.itemIds.length} tracks`,
            collapsed: collapsedGroups.has(group.id),
            onToggleCollapsed: () => toggleCollapsedGroup(group.id),
            selection: {
                checked: getGroupCheckedState(group, selectedIds),
                onCheckedChange: (checked) => toggleGroup(group, checked),
            },
            children: (
                <Flex direction="column" gap="0.5">
                    {group.itemIds.map((itemId) => {
                        const entry = analysis.entriesById[itemId];
                        if (!entry) return null;
                        return (
                            <DuplicateTrackRow
                                key={itemId}
                                item={entry.item}
                                selected={selectedIds.has(itemId)}
                                onToggle={(checked) =>
                                    toggleItem(itemId, checked)
                                }
                            />
                        );
                    })}
                </Flex>
            ),
        }));
    }, [analysis, collapsedGroups, groups, selectedIds]);

    const showHeader = loading || analysis;
    const showEmptyActions = analysis && !loading && totalGroupCount === 0;
    const showFooterActions = analysis && !loading && totalGroupCount > 0;
    const showLoadingActions = loading && !analysis;

    return (
        <FullPageDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Find duplicates"
            titleSize="3"
            description="Review duplicate groups and remove the entries you do not want to keep."
        >
            <Flex direction="column" className="h-full gap-3 overflow-hidden">
                {showHeader && (
                    <div className="rounded-3 bg-panel-solid/35 px-1 py-1.5">
                        <Flex
                            align="center"
                            justify="between"
                            gap="3"
                            wrap="wrap"
                        >
                            <Text size="2" weight="medium">
                                {loading
                                    ? 'Analyzing duplicates'
                                    : `${totalGroupCount} duplicate groups`}
                            </Text>
                            <Flex gap="1">
                                <Button
                                    size="1"
                                    variant="soft"
                                    disabled={loading || !analysis}
                                    onClick={
                                        analysis ? selectSuggested : undefined
                                    }
                                >
                                    Select suggested
                                </Button>
                                <Button
                                    size="1"
                                    variant="ghost"
                                    disabled={loading || !analysis}
                                    onClick={
                                        analysis ? clearSelection : undefined
                                    }
                                >
                                    Clear selection
                                </Button>
                            </Flex>
                        </Flex>
                    </div>
                )}

                <MediaGroupShelf
                    groups={shelfGroups}
                    loading={loading}
                    loadingCount={4}
                    loadingRowsPerGroup={4}
                    emptyState={<EmptyState trackCount={totalTrackCount} />}
                />

                {showLoadingActions && (
                    <Flex justify="end" gap="2">
                        <Dialog.Close>
                            <Button size="1" variant="soft">
                                Close
                            </Button>
                        </Dialog.Close>
                        <Button size="1" color="red" disabled>
                            Remove selected
                        </Button>
                    </Flex>
                )}

                {showEmptyActions && (
                    <Flex justify="end">
                        <Dialog.Close>
                            <Button size="1" variant="soft">
                                Close
                            </Button>
                        </Dialog.Close>
                    </Flex>
                )}

                {showFooterActions && (
                    <Flex justify="end" gap="2">
                        <Dialog.Close>
                            <Button size="1" variant="soft" disabled={removing}>
                                Cancel
                            </Button>
                        </Dialog.Close>
                        <Button
                            size="1"
                            color="red"
                            disabled={selectedItems.length === 0 || removing}
                            onClick={() => onConfirm(selectedItems)}
                        >
                            {removing
                                ? 'Removing...'
                                : `Remove ${selectedItems.length}`}
                        </Button>
                    </Flex>
                )}
            </Flex>
        </FullPageDialog>
    );
}
