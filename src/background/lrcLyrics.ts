import type { FindLyricsResponse, LyricLine } from 'lrclib-api';
import { parseLocalLyrics } from 'lrclib-api';

export type LyricsResponse = Omit<
    FindLyricsResponse,
    'syncedLyrics' | 'unsyncedLyrics'
> & {
    lyrics: LyricLine[] | null;
};

const normalizeStartTime = (line: LyricLine): LyricLine => {
    if (line.startTime == null) return line;

    return {
        ...line,
        startTime: Math.round(line.startTime * 1000),
    };
};

export function normalizeLyricsResponse(
    metadata: FindLyricsResponse
): LyricsResponse | null {
    if (metadata.instrumental) {
        return {
            ...metadata,
            lyrics: [],
        };
    }

    const synced = metadata.syncedLyrics
        ? parseLocalLyrics(metadata.syncedLyrics).synced?.map(
              normalizeStartTime
          )
        : null;

    if (synced?.length) {
        return {
            ...metadata,
            lyrics: synced,
        };
    }

    const unsynced = metadata.plainLyrics
        ? parseLocalLyrics(metadata.plainLyrics).unsynced
        : [];

    if (unsynced.length) {
        return {
            ...metadata,
            lyrics: unsynced,
        };
    }

    return null;
}
