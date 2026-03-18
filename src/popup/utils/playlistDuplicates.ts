import type { MediaShelfItem } from '../components/MediaShelf';

export type PlaylistDedupableItem = MediaShelfItem & {
    playlistIndex: number;
    playlistTrackId?: string;
    playlistTrackUri?: string;
    addedAt?: string;
    durationMs?: number;
};

export type PlaylistDuplicateEntry = {
    id: string;
    item: PlaylistDedupableItem;
    exactKey: string | null;
    possibleKey: string | null;
    titleLabel: string;
};

export type PlaylistDuplicateGroup = {
    id: string;
    title: string;
    itemIds: string[];
    suggestedItemIds: string[];
};

export type PlaylistDuplicateAnalysis = {
    entries: PlaylistDuplicateEntry[];
    entriesById: Record<string, PlaylistDuplicateEntry>;
    groups: PlaylistDuplicateGroup[];
    initialSelectedIds: string[];
};

const normalizeWhitespace = (value: string) =>
    value.replace(/\s+/g, ' ').trim();

const normalizeText = (value: string) =>
    normalizeWhitespace(
        value
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
    );

const stripDecorators = (value: string) =>
    value
        .replace(
            /\s[-:]\s.*\b(remaster(?:ed)?|version|edit|mix|live|mono|stereo|acoustic|instrumental|karaoke|commentary)\b.*$/i,
            ''
        )
        .replace(/\((.*?)\)/g, ' ')
        .replace(/\[(.*?)\]/g, ' ')
        .replace(/\b(feat|featuring|ft)\.?\b.*$/i, '');

const normalizeTitle = (value: string) => normalizeText(stripDecorators(value));

const getPrimaryArtistKey = (item: PlaylistDedupableItem) => {
    const primary = item.artists?.[0]?.name ?? item.subtitle;
    if (!primary) return null;
    const normalized = normalizeText(primary);
    return normalized.length > 0 ? normalized : null;
};

const getExactKey = (item: PlaylistDedupableItem) =>
    item.playlistTrackId ??
    item.playlistTrackUri ??
    item.uri ??
    item.id ??
    null;

const getPossibleKey = (item: PlaylistDedupableItem) => {
    if (item.kind && item.kind !== 'track') return null;
    const titleKey = normalizeTitle(item.title ?? '');
    const artistKey = getPrimaryArtistKey(item);
    if (!titleKey || !artistKey) return null;
    return `${artistKey}::${titleKey}`;
};

const getEntryId = (item: PlaylistDedupableItem) =>
    `playlist-duplicate-${item.playlistIndex}`;

const buildEntry = (item: PlaylistDedupableItem): PlaylistDuplicateEntry => ({
    id: getEntryId(item),
    item,
    exactKey: getExactKey(item),
    possibleKey: getPossibleKey(item),
    titleLabel: item.title || 'Untitled track',
});

const buildDuplicateSets = (
    entries: PlaylistDuplicateEntry[],
    kind: 'exact' | 'possible'
) => {
    const keyToEntries = new Map<string, PlaylistDuplicateEntry[]>();

    entries.forEach((entry) => {
        const key = kind === 'exact' ? entry.exactKey : entry.possibleKey;
        if (!key) return;
        const current = keyToEntries.get(key) ?? [];
        current.push(entry);
        keyToEntries.set(key, current);
    });

    return Array.from(keyToEntries.entries())
        .map(([key, groupEntries]) => {
            if (groupEntries.length < 2) return null;
            if (kind === 'possible') {
                const exactKeys = new Set(
                    groupEntries
                        .map((entry) => entry.exactKey)
                        .filter((value): value is string => Boolean(value))
                );
                if (exactKeys.size < 2) return null;
            }

            return {
                id: `${kind}-${key}`,
                entries: groupEntries,
            };
        })
        .filter(
            (
                group
            ): group is {
                id: string;
                entries: PlaylistDuplicateEntry[];
            } => Boolean(group)
        );
};

export const analyzePlaylistDuplicates = (
    items: PlaylistDedupableItem[]
): PlaylistDuplicateAnalysis => {
    const entries = items.map(buildEntry);
    const entriesById = Object.fromEntries(
        entries.map((entry) => [entry.id, entry] as const)
    );
    const duplicateSets = [
        ...buildDuplicateSets(entries, 'exact'),
        ...buildDuplicateSets(entries, 'possible'),
    ];
    const linkedIds = new Map<string, Set<string>>();

    duplicateSets.forEach(({ entries: setEntries }) => {
        setEntries.forEach((entry) => {
            const current = linkedIds.get(entry.id) ?? new Set<string>();
            setEntries.forEach((linkedEntry) => current.add(linkedEntry.id));
            linkedIds.set(entry.id, current);
        });
    });

    const visited = new Set<string>();
    const groups = Array.from(linkedIds.keys())
        .map((entryId) => {
            if (visited.has(entryId)) return null;

            const queue = [entryId];
            const componentIds = new Set<string>();

            while (queue.length > 0) {
                const currentId = queue.shift();
                if (!currentId || visited.has(currentId)) continue;

                visited.add(currentId);
                componentIds.add(currentId);

                linkedIds.get(currentId)?.forEach((linkedId) => {
                    if (!visited.has(linkedId)) queue.push(linkedId);
                });
            }

            if (componentIds.size < 2) return null;

            const sortedEntries = Array.from(componentIds)
                .map((id) => entriesById[id])
                .filter((entry): entry is PlaylistDuplicateEntry =>
                    Boolean(entry)
                )
                .sort(
                    (left, right) =>
                        left.item.playlistIndex - right.item.playlistIndex
                );

            if (sortedEntries.length < 2) return null;

            return {
                id: `duplicate-group-${sortedEntries[0].id}`,
                title: sortedEntries[0].titleLabel,
                itemIds: sortedEntries.map((entry) => entry.id),
                suggestedItemIds: sortedEntries
                    .slice(1)
                    .map((entry) => entry.id),
            } satisfies PlaylistDuplicateGroup;
        })
        .filter((group): group is PlaylistDuplicateGroup => Boolean(group))
        .sort((left, right) => {
            const leftIndex =
                entriesById[left.itemIds[0]]?.item.playlistIndex ?? 0;
            const rightIndex =
                entriesById[right.itemIds[0]]?.item.playlistIndex ?? 0;
            return leftIndex - rightIndex;
        });
    const initialSelectedIds = groups.flatMap(
        (group) => group.suggestedItemIds
    );

    return {
        entries,
        entriesById,
        groups,
        initialSelectedIds,
    };
};
