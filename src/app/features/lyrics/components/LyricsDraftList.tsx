import { Pencil1Icon, PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Separator, Text } from '@radix-ui/themes';

import type { LyricDraft } from '../drafts';
import { formatDraftDate } from '../model';

type LyricsDraftListProps = {
    drafts: LyricDraft[];
    loading: boolean;
    selectedDraftId: string | null;
    onCreateDraft: () => void;
    onOpenDraft: (draft: LyricDraft) => void;
};

export function LyricsDraftList({
    drafts,
    loading,
    selectedDraftId,
    onCreateDraft,
    onOpenDraft,
}: LyricsDraftListProps) {
    return (
        <Flex direction="column" gap="3" pt="3">
            <Flex align="center" justify="between" gap="2">
                <Text size="1" color="gray">
                    {drafts.length} saved{' '}
                    {drafts.length === 1 ? 'draft' : 'drafts'}
                </Text>
                <Button size="1" variant="soft" onClick={onCreateDraft}>
                    <PlusIcon />
                    New draft
                </Button>
            </Flex>

            {loading ? (
                <Flex align="center" gap="2">
                    <ReloadIcon className="animate-spin" />
                    <Text size="2" color="gray">
                        Loading drafts
                    </Text>
                </Flex>
            ) : drafts.length === 0 ? (
                <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">
                        No drafts yet
                    </Text>
                    <Text size="2" color="gray">
                        Start from the current track or create a blank draft.
                    </Text>
                </Flex>
            ) : (
                <Flex direction="column">
                    {drafts.map((draft, index) => (
                        <Flex
                            key={draft.id}
                            direction="column"
                            gap="2"
                            py="2"
                            className={
                                selectedDraftId === draft.id
                                    ? 'text-accent-11'
                                    : undefined
                            }
                        >
                            <Flex align="center" justify="between" gap="3">
                                <Flex direction="column" gap="1" minWidth="0">
                                    <Text size="3" weight="bold" truncate>
                                        {draft.title}
                                    </Text>
                                    <Text size="1" color="gray" truncate>
                                        {draft.artistName || 'No artist'} ·{' '}
                                        {formatDraftDate(draft.updatedAt)}
                                    </Text>
                                </Flex>
                                <Button
                                    size="1"
                                    variant="ghost"
                                    onClick={() => onOpenDraft(draft)}
                                >
                                    <Pencil1Icon />
                                    Edit
                                </Button>
                            </Flex>
                            {index < drafts.length - 1 && (
                                <Separator size="4" />
                            )}
                        </Flex>
                    ))}
                </Flex>
            )}
        </Flex>
    );
}
