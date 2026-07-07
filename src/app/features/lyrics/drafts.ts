import type { Episode, Track } from '@spotify/web-api-ts-sdk';

export type LyricDraftSource = {
    trackId?: string;
    trackUri?: string;
    title: string;
    artistName: string;
    albumName?: string;
    durationMs?: number;
    imageUrl?: string;
};

export type LyricDraft = LyricDraftSource & {
    id: string;
    text: string;
    createdAt: string;
    updatedAt: string;
};

const normalizeMatchValue = (value: string) => value.trim().toLowerCase();

const hasDraftId = (drafts: LyricDraft[], id: string) =>
    drafts.some((draft) => draft.id === id);

export function getLyricDraftSourceFromTrack(
    item?: Partial<Track | Episode> | null
): LyricDraftSource | null {
    if (!item || item.type !== 'track') return null;
    const track = item as Partial<Track>;
    if (!track.name?.trim()) return null;

    const artistName = track.artists
        ?.map((artist) => artist.name)
        .filter(Boolean)
        .join(', ');

    if (!artistName) return null;

    return {
        trackId: track.id || undefined,
        trackUri: track.uri || undefined,
        title: track.name,
        artistName,
        albumName: track.album?.name || undefined,
        durationMs: track.duration_ms,
        imageUrl: track.album?.images?.[0]?.url,
    };
}

export function createLyricDraft({
    id,
    source,
    text,
    now,
}: {
    id: string;
    source: LyricDraftSource;
    text: string;
    now: string;
}): LyricDraft {
    return {
        id,
        ...source,
        text,
        createdAt: now,
        updatedAt: now,
    };
}

export function sortLyricDrafts(drafts: LyricDraft[]) {
    return [...drafts].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
    );
}

export function findDraftForSource(
    drafts: LyricDraft[],
    source: LyricDraftSource | null
) {
    if (!source) return undefined;

    if (source.trackId) {
        const byId = drafts.find((draft) => draft.trackId === source.trackId);
        if (byId) return byId;
    }

    if (source.trackUri) {
        const byUri = drafts.find(
            (draft) => draft.trackUri === source.trackUri
        );
        if (byUri) return byUri;
    }

    const sourceTitle = normalizeMatchValue(source.title);
    const sourceArtist = normalizeMatchValue(source.artistName);

    return drafts.find(
        (draft) =>
            normalizeMatchValue(draft.title) === sourceTitle &&
            normalizeMatchValue(draft.artistName) === sourceArtist
    );
}

export function updateLyricDraft(
    drafts: LyricDraft[],
    id: string,
    patch: Partial<
        Pick<
            LyricDraft,
            'title' | 'artistName' | 'albumName' | 'durationMs' | 'text'
        >
    >,
    now: string
) {
    if (!hasDraftId(drafts, id)) {
        throw new Error(`Lyric draft ${id} not found`);
    }

    return sortLyricDrafts(
        drafts.map((draft) =>
            draft.id === id
                ? {
                      ...draft,
                      ...patch,
                      updatedAt: now,
                  }
                : draft
        )
    );
}

export function deleteLyricDraft(drafts: LyricDraft[], id: string) {
    if (!hasDraftId(drafts, id)) {
        throw new Error(`Lyric draft ${id} not found`);
    }

    return drafts.filter((draft) => draft.id !== id);
}
