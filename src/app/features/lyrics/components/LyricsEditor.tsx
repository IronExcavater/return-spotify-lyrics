import type { ChangeEvent, RefObject } from 'react';
import {
    ClipboardCopyIcon,
    ClockIcon,
    FileTextIcon,
    PlusIcon,
    TrashIcon,
} from '@radix-ui/react-icons';
import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';

import type { EditorDraft } from '../model';

type LyricsEditorProps = {
    draft: EditorDraft | null;
    saving: boolean;
    deleting: boolean;
    textareaRef: RefObject<HTMLTextAreaElement>;
    onChange: (patch: Partial<EditorDraft>) => void;
    onInsertTimestamp: () => void;
    onCopy: () => void;
    onSave: () => void;
    onDelete: () => void;
    onCreateDraft: () => void;
};

export function LyricsEditor({
    draft,
    saving,
    deleting,
    textareaRef,
    onChange,
    onInsertTimestamp,
    onCopy,
    onSave,
    onDelete,
    onCreateDraft,
}: LyricsEditorProps) {
    if (!draft) {
        return (
            <Flex direction="column" gap="3" pt="3">
                <Flex direction="column" gap="1">
                    <Text size="3" weight="bold">
                        No draft selected
                    </Text>
                    <Text size="2" color="gray">
                        Choose a saved draft or start a new one.
                    </Text>
                </Flex>
                <Button size="1" className="w-fit" onClick={onCreateDraft}>
                    <PlusIcon />
                    New draft
                </Button>
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap="3" pt="3">
            <Flex
                align="center"
                justify="between"
                gap="2"
                className="flex-wrap"
            >
                <Flex align="center" gap="2">
                    <Button size="1" variant="soft" onClick={onInsertTimestamp}>
                        <ClockIcon />
                        Timestamp
                    </Button>
                    <Button
                        size="1"
                        variant="soft"
                        disabled={!draft.text.trim()}
                        onClick={onCopy}
                    >
                        <ClipboardCopyIcon />
                        Copy
                    </Button>
                </Flex>
                <Flex align="center" gap="2">
                    <Button
                        size="1"
                        variant="soft"
                        color="red"
                        disabled={deleting || saving}
                        onClick={onDelete}
                    >
                        <TrashIcon />
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                        size="1"
                        disabled={saving || deleting || !draft.title.trim()}
                        onClick={onSave}
                    >
                        <FileTextIcon />
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </Flex>
            </Flex>

            <Flex direction="column" gap="2">
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Title
                    </Text>
                    <TextField.Root
                        value={draft.title}
                        disabled={saving || deleting}
                        onChange={(event) =>
                            onChange({ title: event.target.value })
                        }
                    />
                </Flex>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Artist
                    </Text>
                    <TextField.Root
                        value={draft.artistName}
                        disabled={saving || deleting}
                        onChange={(event) =>
                            onChange({ artistName: event.target.value })
                        }
                    />
                </Flex>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Album
                    </Text>
                    <TextField.Root
                        value={draft.albumName ?? ''}
                        disabled={saving || deleting}
                        onChange={(event) =>
                            onChange({ albumName: event.target.value })
                        }
                    />
                </Flex>
                <Flex direction="column" gap="1">
                    <Text size="1" color="gray">
                        Lyrics
                    </Text>
                    <TextArea
                        ref={textareaRef}
                        value={draft.text}
                        disabled={saving || deleting}
                        resize="vertical"
                        rows={14}
                        placeholder="Write or paste lyrics"
                        aria-label="Lyrics draft"
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                            onChange({ text: event.target.value })
                        }
                    />
                </Flex>
            </Flex>
        </Flex>
    );
}
