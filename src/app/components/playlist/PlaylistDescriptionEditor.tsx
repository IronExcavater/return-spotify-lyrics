import { Button, Flex, Text, TextArea } from '@radix-ui/themes';

import type { PlaylistDetailsDraft } from '../../features/playlists/usePlaylistManagement';
import { SkeletonText } from '../SkeletonText';

type SharedProps = {
    draft: PlaylistDetailsDraft | null;
    editing: boolean;
    saving: boolean;
    onUpdateDraft: (
        update: (previous: PlaylistDetailsDraft) => PlaylistDetailsDraft
    ) => void;
};

export function PlaylistDescriptionEditor({
    loading,
    canEdit,
    description,
    draft,
    editing,
    saving,
    onStartEditing,
    onCancelEditing,
    onSaveDetails,
    onUpdateDraft,
}: SharedProps & {
    loading: boolean;
    canEdit: boolean;
    description: string;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onSaveDetails: () => void;
}) {
    if (!loading && !description && !canEdit) return null;

    return (
        <Flex direction="column" gap="1" pt="2">
            <Text size="1" color="gray">
                Description
            </Text>
            {loading ? (
                <Flex direction="column" gap="1" className="max-w-120">
                    <SkeletonText loading variant="subtitle" fullWidth={false}>
                        <Text size="2" />
                    </SkeletonText>
                    <SkeletonText
                        loading
                        variant="subtitle"
                        fullWidth={false}
                        seed={1}
                    >
                        <Text size="2" />
                    </SkeletonText>
                </Flex>
            ) : editing && draft ? (
                <>
                    <TextArea
                        value={draft.description}
                        disabled={saving}
                        resize="vertical"
                        rows={4}
                        placeholder="Add a description"
                        aria-label="Playlist description"
                        onChange={(event) =>
                            onUpdateDraft((previous) => ({
                                ...previous,
                                description: event.target.value,
                            }))
                        }
                    />
                    <Flex gap="2">
                        <Button
                            size="1"
                            variant="soft"
                            disabled={saving}
                            onClick={onCancelEditing}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="1"
                            disabled={saving || !draft.name.trim()}
                            onClick={onSaveDetails}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </Flex>
                </>
            ) : description ? (
                <Text size="2">{description}</Text>
            ) : (
                <Button
                    size="1"
                    variant="ghost"
                    className="w-fit"
                    onClick={onStartEditing}
                >
                    Add a description
                </Button>
            )}
        </Flex>
    );
}
