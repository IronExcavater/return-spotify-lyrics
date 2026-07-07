import { Flex, Tabs, Text } from '@radix-ui/themes';

import { LiveLyricsPanel } from '../features/lyrics/components/LiveLyricsPanel';
import { LyricsDraftList } from '../features/lyrics/components/LyricsDraftList';
import { LyricsEditor } from '../features/lyrics/components/LyricsEditor';
import type { LyricsMode } from '../features/lyrics/model';
import { useLyricsWorkspace } from '../features/lyrics/useLyricsWorkspace';

export function LyricsView() {
    const {
        headerTitle,
        headerSubtitle,
        mode,
        setMode,
        livePanel,
        draftList,
        editor,
    } = useLyricsWorkspace();

    return (
        <Flex
            direction="column"
            flexGrow="1"
            className="no-overflow-anchor scrollbar-gutter-stable min-h-70 overflow-y-auto text-white"
            p="4"
            gap="3"
        >
            <Flex direction="column" gap="1">
                <Text size="5" weight="bold">
                    {headerTitle}
                </Text>
                <Text size="2" color="gray">
                    {headerSubtitle}
                </Text>
            </Flex>

            <Tabs.Root
                value={mode}
                onValueChange={(value) => setMode(value as LyricsMode)}
            >
                <Tabs.List size="1">
                    <Tabs.Trigger value="live">Live</Tabs.Trigger>
                    <Tabs.Trigger value="drafts">Drafts</Tabs.Trigger>
                    <Tabs.Trigger value="editor">Editor</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="live">
                    <LiveLyricsPanel {...livePanel} />
                </Tabs.Content>

                <Tabs.Content value="drafts">
                    <LyricsDraftList {...draftList} />
                </Tabs.Content>

                <Tabs.Content value="editor">
                    <LyricsEditor {...editor} />
                </Tabs.Content>
            </Tabs.Root>
        </Flex>
    );
}
