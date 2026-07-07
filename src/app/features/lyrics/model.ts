import type { sendLyricsMessage } from '../../../shared/messaging';
import type { LyricDraft, LyricDraftSource } from './drafts';

export type LyricsResult = Awaited<
    ReturnType<typeof sendLyricsMessage<'getLyrics'>>
>;
export type LyricsMode = 'live' | 'drafts' | 'editor';
export type EditorDraft = Pick<
    LyricDraft,
    'id' | 'title' | 'artistName' | 'albumName' | 'durationMs' | 'text'
>;

export const hasTimedLyrics = (lyrics: LyricsResult) =>
    Boolean(lyrics?.lyrics?.some((line) => line.startTime != null));

export const getActiveLyricIndex = (
    lyrics: LyricsResult,
    progressMs: number
): number | null => {
    const lines = lyrics?.lyrics ?? [];
    let activeIndex: number | null = null;

    lines.forEach((line, index) => {
        if (line.startTime == null) return;
        if (line.startTime <= progressMs + 250) activeIndex = index;
    });

    return activeIndex;
};

export const getLyricLineWeight = (active: boolean) =>
    active ? 'bold' : 'medium';

export const toEditorDraft = (draft: LyricDraft): EditorDraft => ({
    id: draft.id,
    title: draft.title,
    artistName: draft.artistName,
    albumName: draft.albumName ?? '',
    durationMs: draft.durationMs,
    text: draft.text,
});

export const formatDraftDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));

export const createBlankDraftSource = (): LyricDraftSource => ({
    title: 'Untitled lyrics',
    artistName: '',
});
