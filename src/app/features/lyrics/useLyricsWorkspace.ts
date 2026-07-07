import { useEffect, useMemo, useRef, useState } from 'react';

import { normalizeError } from '../../../shared/logging';
import { sendLyricsMessage } from '../../../shared/messaging';
import { showToast } from '../../data/toastStore';
import {
    MEDIA_CACHE_KEYS,
    type NowPlayingCacheEntry,
} from '../../hooks/mediaCacheEntries';
import { useMediaCacheEntry } from '../../hooks/useMediaCache';
import { usePlayer } from '../../hooks/usePlayer';
import {
    formatLrcTimestamp,
    formatLyricsForDraft,
    insertTimestampAtSelection,
} from './creator';
import {
    findDraftForSource,
    getLyricDraftSourceFromTrack,
    type LyricDraft,
    type LyricDraftSource,
} from './drafts';
import {
    createBlankDraftSource,
    getActiveLyricIndex,
    hasTimedLyrics,
    toEditorDraft,
    type EditorDraft,
    type LyricsMode,
    type LyricsResult,
} from './model';
import { buildLyricsQueryFromTrack } from './query';
import { useLyricDrafts } from './useLyricDrafts';

type CreateDraftForSourceInput = {
    source: LyricDraftSource;
    text: string;
};

export function useLyricsWorkspace() {
    const cachedNowPlaying = useMediaCacheEntry<NowPlayingCacheEntry>(
        MEDIA_CACHE_KEYS.nowPlaying
    );
    const { playback, progressMs } = usePlayer();
    const currentItem =
        playback?.item?.type === 'track' || playback?.item?.type === 'episode'
            ? playback.item
            : cachedNowPlaying?.item;
    const query = useMemo(
        () => buildLyricsQueryFromTrack(currentItem),
        [currentItem]
    );
    const currentSource = useMemo(
        () => getLyricDraftSourceFromTrack(currentItem),
        [currentItem]
    );
    const queryKey = query ? JSON.stringify(query) : '';
    const [lyrics, setLyrics] = useState<LyricsResult>(null);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);
    const [mode, setMode] = useState<LyricsMode>('live');
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
    const [editorDraft, setEditorDraft] = useState<EditorDraft | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [deletingDraft, setDeletingDraft] = useState(false);
    const draftRef = useRef<HTMLTextAreaElement | null>(null);
    const {
        drafts,
        loading: draftsLoading,
        createDraft,
        saveDraft,
        deleteDraft,
    } = useLyricDrafts();

    useEffect(() => {
        if (!query) {
            setLyrics(null);
            setLyricsError(null);
            setLyricsLoading(false);
            return;
        }

        let cancelled = false;
        setLyricsLoading(true);
        setLyricsError(null);

        void sendLyricsMessage('getLyrics', query)
            .then((result) => {
                if (cancelled) return;
                setLyrics(result);
            })
            .catch((caught) => {
                if (cancelled) return;
                setLyrics(null);
                setLyricsError(normalizeError(caught).message);
            })
            .finally(() => {
                if (!cancelled) setLyricsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [queryKey]);

    useEffect(() => {
        if (!selectedDraftId) return;

        const draft = drafts.find((item) => item.id === selectedDraftId);
        if (!draft) {
            setSelectedDraftId(null);
            setEditorDraft(null);
            return;
        }

        setEditorDraft(toEditorDraft(draft));
    }, [drafts, selectedDraftId]);

    const activeLyricIndex = getActiveLyricIndex(lyrics, progressMs);
    const timedLyrics = hasTimedLyrics(lyrics);
    const liveDraftText = formatLyricsForDraft(lyrics?.lyrics ?? null);
    const matchingDraft = findDraftForSource(drafts, currentSource);
    const headerTitle =
        mode === 'editor' && editorDraft
            ? editorDraft.title
            : (query?.track_name ?? cachedNowPlaying?.title ?? 'Lyrics');
    const headerSubtitle =
        mode === 'editor' && editorDraft
            ? editorDraft.artistName || 'No artist'
            : (query?.artist_name ??
              cachedNowPlaying?.subtitle ??
              'No track selected');

    const openDraft = (draft: LyricDraft) => {
        setSelectedDraftId(draft.id);
        setEditorDraft(toEditorDraft(draft));
        setMode('editor');
    };

    const createDraftForSource = async ({
        source,
        text,
    }: CreateDraftForSourceInput) => {
        const draft = await createDraft({ source, text });
        openDraft(draft);
        showToast({ title: 'Draft created', tone: 'success' });
    };

    const createCurrentDraft = async () => {
        const source = currentSource ?? createBlankDraftSource();
        await createDraftForSource({
            source,
            text: currentSource ? liveDraftText : '',
        });
    };

    const editCurrentLyrics = async () => {
        if (matchingDraft) {
            openDraft(matchingDraft);
            return;
        }
        if (!currentSource) {
            throw new Error('Cannot create a lyric draft without a track');
        }
        await createDraftForSource({
            source: currentSource,
            text: liveDraftText,
        });
    };

    const requireEditorDraft = () => {
        if (!editorDraft) throw new Error('No lyric draft is selected');
        return editorDraft;
    };

    const updateEditorDraft = (patch: Partial<EditorDraft>) => {
        const draft = requireEditorDraft();
        setEditorDraft({ ...draft, ...patch });
    };

    const insertCurrentTimestamp = () => {
        const draft = requireEditorDraft();
        const target = draftRef.current;
        const timestamp = formatLrcTimestamp(progressMs);
        const next = insertTimestampAtSelection({
            value: draft.text,
            selectionStart: target?.selectionStart ?? draft.text.length,
            selectionEnd: target?.selectionEnd ?? draft.text.length,
            timestamp,
        });

        setEditorDraft({ ...draft, text: next.value });
        requestAnimationFrame(() => {
            target?.focus();
            target?.setSelectionRange(next.cursor, next.cursor);
        });
    };

    const copyEditorDraft = () => {
        const draft = requireEditorDraft();
        void navigator.clipboard
            .writeText(draft.text)
            .then(() => showToast({ title: 'Lyrics copied', tone: 'success' }));
    };

    const saveEditorDraft = async () => {
        const draft = requireEditorDraft();
        setSavingDraft(true);
        try {
            const saved = await saveDraft(draft.id, {
                title: draft.title.trim(),
                artistName: draft.artistName.trim(),
                albumName: draft.albumName?.trim() || undefined,
                durationMs: draft.durationMs,
                text: draft.text,
            });
            setSelectedDraftId(saved.id);
            setEditorDraft(toEditorDraft(saved));
            showToast({ title: 'Draft saved', tone: 'success' });
        } catch (error) {
            showToast({
                title: 'Could not save draft',
                description: normalizeError(error).message,
                tone: 'danger',
            });
        } finally {
            setSavingDraft(false);
        }
    };

    const deleteEditorDraft = async () => {
        const draft = requireEditorDraft();
        setDeletingDraft(true);
        try {
            await deleteDraft(draft.id);
            setSelectedDraftId(null);
            setEditorDraft(null);
            setMode('drafts');
            showToast({ title: 'Draft deleted', tone: 'success' });
        } catch (error) {
            showToast({
                title: 'Could not delete draft',
                description: normalizeError(error).message,
                tone: 'danger',
            });
        } finally {
            setDeletingDraft(false);
        }
    };

    return {
        headerTitle,
        headerSubtitle,
        mode,
        setMode,
        livePanel: {
            query,
            lyrics,
            loading: lyricsLoading,
            error: lyricsError,
            timedLyrics,
            activeLyricIndex,
            matchingDraft,
            currentSource,
            onEditCurrent: () => void editCurrentLyrics(),
        },
        draftList: {
            drafts,
            loading: draftsLoading,
            selectedDraftId,
            onCreateDraft: () => void createCurrentDraft(),
            onOpenDraft: openDraft,
        },
        editor: {
            draft: editorDraft,
            saving: savingDraft,
            deleting: deletingDraft,
            textareaRef: draftRef,
            onChange: updateEditorDraft,
            onInsertTimestamp: insertCurrentTimestamp,
            onCopy: copyEditorDraft,
            onSave: () => void saveEditorDraft(),
            onDelete: () => void deleteEditorDraft(),
            onCreateDraft: () => void createCurrentDraft(),
        },
    };
}
