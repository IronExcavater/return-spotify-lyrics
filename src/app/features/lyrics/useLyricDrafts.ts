import { useCallback, useEffect, useState } from 'react';

import {
    getFromStorage,
    onStorageChange,
    setInStorage,
} from '../../../shared/storage';
import {
    createLyricDraft,
    deleteLyricDraft,
    sortLyricDrafts,
    updateLyricDraft,
    type LyricDraft,
    type LyricDraftSource,
} from './drafts';

export const LYRIC_DRAFTS_STORAGE_KEY = 'lyricsDrafts.v1';

type CreateDraftInput = {
    source: LyricDraftSource;
    text?: string;
};

type SaveDraftPatch = Parameters<typeof updateLyricDraft>[2];

export function useLyricDrafts() {
    const [drafts, setDrafts] = useState<LyricDraft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const unsubscribe = onStorageChange<LyricDraft[]>(
            LYRIC_DRAFTS_STORAGE_KEY,
            (next) => {
                setDrafts(sortLyricDrafts(next ?? []));
            }
        );

        void (async () => {
            const stored = await getFromStorage<LyricDraft[]>(
                LYRIC_DRAFTS_STORAGE_KEY
            );
            if (cancelled) return;
            setDrafts(sortLyricDrafts(stored ?? []));
            setLoading(false);
        })();

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const persistDrafts = useCallback(async (next: LyricDraft[]) => {
        const sorted = sortLyricDrafts(next);
        await setInStorage(LYRIC_DRAFTS_STORAGE_KEY, sorted);
        setDrafts(sorted);
        return sorted;
    }, []);

    const createDraft = useCallback(
        async ({ source, text = '' }: CreateDraftInput) => {
            const now = new Date().toISOString();
            const draft = createLyricDraft({
                id: crypto.randomUUID(),
                source,
                text,
                now,
            });
            await persistDrafts([draft, ...drafts]);
            return draft;
        },
        [drafts, persistDrafts]
    );

    const saveDraft = useCallback(
        async (id: string, patch: SaveDraftPatch) => {
            const next = updateLyricDraft(
                drafts,
                id,
                patch,
                new Date().toISOString()
            );
            const saved = next.find((draft) => draft.id === id);
            if (!saved) throw new Error(`Lyric draft ${id} was not saved`);
            await persistDrafts(next);
            return saved;
        },
        [drafts, persistDrafts]
    );

    const deleteDraft = useCallback(
        async (id: string) => {
            await persistDrafts(deleteLyricDraft(drafts, id));
        },
        [drafts, persistDrafts]
    );

    return {
        drafts,
        loading,
        createDraft,
        saveDraft,
        deleteDraft,
    };
}
