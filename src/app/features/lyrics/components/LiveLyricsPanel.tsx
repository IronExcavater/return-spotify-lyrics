import { Pencil1Icon, ReloadIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';
import type { Query } from 'lrclib-api';

import type { LyricDraft, LyricDraftSource } from '../drafts';
import { getLyricLineWeight, type LyricsResult } from '../model';

type LiveLyricsPanelProps = {
    query: Query | null;
    lyrics: LyricsResult;
    loading: boolean;
    error: string | null;
    timedLyrics: boolean;
    activeLyricIndex: number | null;
    matchingDraft?: LyricDraft;
    currentSource: LyricDraftSource | null;
    onEditCurrent: () => void;
};

export function LiveLyricsPanel({
    query,
    lyrics,
    loading,
    error,
    timedLyrics,
    activeLyricIndex,
    matchingDraft,
    currentSource,
    onEditCurrent,
}: LiveLyricsPanelProps) {
    return (
        <Flex direction="column" gap="3" pt="3">
            <Flex align="center" justify="between" gap="2">
                <Text size="1" color="gray">
                    {timedLyrics ? 'Synced lyrics' : 'Live lyrics'}
                </Text>
                <Button
                    size="1"
                    variant="soft"
                    disabled={!currentSource}
                    onClick={onEditCurrent}
                >
                    <Pencil1Icon />
                    {matchingDraft ? 'Open draft' : 'Edit lyrics'}
                </Button>
            </Flex>

            {loading ? (
                <Flex align="center" gap="2">
                    <ReloadIcon className="animate-spin" />
                    <Text size="2" color="gray">
                        Loading lyrics
                    </Text>
                </Flex>
            ) : error ? (
                <Text size="2" color="gray">
                    {error}
                </Text>
            ) : !query ? (
                <Text size="2" color="gray">
                    Play a track to load lyrics.
                </Text>
            ) : !lyrics?.lyrics ? (
                <Text size="2" color="gray">
                    No lyrics found. Create a draft to write your own.
                </Text>
            ) : lyrics.lyrics.length === 0 ? (
                <Text size="5" weight="bold">
                    Instrumental
                </Text>
            ) : (
                <Flex direction="column" gap="2">
                    {lyrics.lyrics.map((line, index) => {
                        const active =
                            timedLyrics && activeLyricIndex === index;
                        return (
                            <Text
                                key={`${line.startTime ?? index}-${line.text}`}
                                size="4"
                                weight={getLyricLineWeight(active)}
                                color={active ? undefined : 'gray'}
                                className="transition-colors"
                            >
                                {line.text}
                            </Text>
                        );
                    })}
                </Flex>
            )}
        </Flex>
    );
}
