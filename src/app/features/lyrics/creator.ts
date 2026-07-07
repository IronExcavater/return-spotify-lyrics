export function formatLrcTimestamp(ms: number) {
    const safeMs = Math.max(0, Math.floor(ms));
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((safeMs % 1000) / 10);

    return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
}

export function insertTimestampAtSelection({
    value,
    selectionStart,
    selectionEnd,
    timestamp,
}: {
    value: string;
    selectionStart: number;
    selectionEnd: number;
    timestamp: string;
}) {
    const start = Math.max(0, Math.min(selectionStart, value.length));
    const end = Math.max(start, Math.min(selectionEnd, value.length));
    const nextValue = `${value.slice(0, start)}${timestamp}${value.slice(end)}`;

    return {
        value: nextValue,
        cursor: start + timestamp.length,
    };
}

type DraftLyricLine = {
    text: string;
    startTime?: number | null;
};

export function formatLyricsForDraft(lines: DraftLyricLine[] | null) {
    if (!lines) return '';

    return lines
        .map((line) =>
            line.startTime == null
                ? line.text
                : `${formatLrcTimestamp(line.startTime)}${line.text}`
        )
        .join('\n');
}
