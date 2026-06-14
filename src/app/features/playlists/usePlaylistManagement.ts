import {
    useCallback,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { normalizeError } from '../../../shared/logging';
import { sendSpotifyMessage } from '../../../shared/messaging';
import type { MediaAction } from '../../../shared/types';
import { showToast } from '../../data/toastStore';
import { preparePlaylistCover } from './cover';
import { duplicateAsPlaylistAndNotify } from './management';
import {
    removeTrackPlaylistFromCache,
    type PlaylistContentState,
    type PlaylistWithNullablePublic,
} from './store';

export type PlaylistDetailsDraft = {
    name: string;
    description: string;
    isPublic: boolean | null;
    isCollaborative: boolean;
};

const toDetailsDraft = (
    playlist: Pick<
        PlaylistWithNullablePublic,
        'name' | 'description' | 'public' | 'collaborative'
    >
): PlaylistDetailsDraft => ({
    name: playlist.name ?? '',
    description: playlist.description ?? '',
    isPublic: playlist.public === null ? null : Boolean(playlist.public),
    isCollaborative: Boolean(playlist.collaborative),
});

const errorDescription = (error: unknown) => normalizeError(error).message;

export function usePlaylistDetailsEditor({
    data,
    setData,
}: {
    data: PlaylistContentState | null;
    setData: Dispatch<SetStateAction<PlaylistContentState | null>>;
}) {
    const [draft, setDraft] = useState<PlaylistDetailsDraft | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const startEditing = useCallback(() => {
        if (!data) return;
        setDraft(toDetailsDraft(data.playlist));
        setEditing(true);
    }, [data]);

    const cancelEditing = useCallback(() => {
        setDraft(data ? toDetailsDraft(data.playlist) : null);
        setEditing(false);
    }, [data]);

    const updateDraft = useCallback(
        (update: (previous: PlaylistDetailsDraft) => PlaylistDetailsDraft) => {
            setDraft((previous) => (previous ? update(previous) : previous));
        },
        []
    );

    const saveDetails = useCallback(async () => {
        if (!data || !draft || !draft.name.trim()) return;
        const nextDetails = {
            name: draft.name.trim(),
            description: draft.description,
            public: draft.isPublic,
            collaborative: draft.isCollaborative,
        };

        setSaving(true);
        try {
            await sendSpotifyMessage('changePlaylistDetails', {
                id: data.playlist.id,
                ...nextDetails,
            });
            setData((previous) =>
                previous
                    ? {
                          ...previous,
                          playlist: {
                              ...previous.playlist,
                              ...nextDetails,
                          },
                      }
                    : previous
            );
            setDraft(toDetailsDraft({ ...data.playlist, ...nextDetails }));
            setEditing(false);
        } catch (error) {
            showToast({
                title: 'Could not save playlist details',
                description: errorDescription(error),
                tone: 'danger',
            });
        } finally {
            setSaving(false);
        }
    }, [data, draft, setData]);

    return {
        draft,
        editing,
        saving,
        startEditing,
        cancelEditing,
        updateDraft,
        saveDetails,
    };
}

type Options = {
    data: PlaylistContentState | null;
    setData: Dispatch<SetStateAction<PlaylistContentState | null>>;
    profileId?: string;
    canEdit: boolean;
    isOwner: boolean;
    canOpenDedupe: boolean;
    onEdit: () => void;
    onOpenDedupe: () => void;
    onReload: () => Promise<void>;
    onRemoved: () => void;
};

export function usePlaylistManagement({
    data,
    setData,
    profileId,
    canEdit,
    isOwner,
    canOpenDedupe,
    onEdit,
    onOpenDedupe,
    onReload,
    onRemoved,
}: Options) {
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
    const [removalOpen, setRemovalOpen] = useState(false);
    const [removing, setRemoving] = useState(false);

    const updateProperties = useCallback(
        async (properties: { public?: boolean; collaborative?: boolean }) => {
            if (!data) return;
            try {
                await sendSpotifyMessage('changePlaylistDetails', {
                    id: data.playlist.id,
                    ...properties,
                });
                setData((previous) =>
                    previous
                        ? {
                              ...previous,
                              playlist: {
                                  ...previous.playlist,
                                  ...properties,
                              },
                          }
                        : previous
                );
            } catch (error) {
                showToast({
                    title: 'Could not update playlist',
                    description: errorDescription(error),
                    tone: 'danger',
                });
            }
        },
        [data, setData]
    );

    const duplicate = useCallback(async () => {
        if (!data || !profileId) return;
        await duplicateAsPlaylistAndNotify({
            userId: profileId,
            source: {
                kind: 'playlist',
                id: data.playlist.id,
                title: data.playlist.name,
            },
            toast: {
                successTitle: 'Playlist duplicated',
                errorTitle: 'Could not duplicate playlist',
            },
        });
    }, [data, profileId]);

    const uploadCover = useCallback(
        async (file?: File) => {
            if (!data || !file) return;
            try {
                const base64Jpeg = await preparePlaylistCover(file);
                await sendSpotifyMessage('uploadPlaylistCover', {
                    id: data.playlist.id,
                    base64Jpeg,
                });
                await onReload();
                showToast({
                    title: 'Playlist cover updated',
                    tone: 'success',
                });
            } catch (error) {
                showToast({
                    title: 'Could not update playlist cover',
                    description: errorDescription(error),
                    tone: 'danger',
                });
            } finally {
                if (coverInputRef.current) coverInputRef.current.value = '';
            }
        },
        [data, onReload]
    );

    const remove = useCallback(async () => {
        if (!data || removing) return;
        setRemoving(true);
        try {
            await sendSpotifyMessage('unfollowPlaylist', {
                id: data.playlist.id,
            });
            await removeTrackPlaylistFromCache(data.playlist.id);
            showToast({
                title: 'Playlist removed from your library',
                tone: 'success',
            });
            setRemovalOpen(false);
            onRemoved();
        } catch (error) {
            showToast({
                title: 'Could not remove playlist',
                description: errorDescription(error),
                tone: 'danger',
            });
        } finally {
            setRemoving(false);
        }
    }, [data, onRemoved, removing]);

    const actions = useMemo(() => {
        if (!data) return [];
        const playlist = data.playlist;
        const result: MediaAction[] = [];

        if (canEdit) {
            result.push({
                id: 'edit-playlist',
                label: 'Edit details',
                shortcut: 'E',
                onSelect: onEdit,
            });
        }

        if (isOwner) {
            result.push(
                {
                    id: 'toggle-playlist-visibility',
                    label: playlist.public ? 'Make private' : 'Make public',
                    onSelect: () =>
                        void updateProperties({ public: !playlist.public }),
                },
                {
                    id: 'toggle-playlist-collaboration',
                    label: playlist.collaborative
                        ? 'Disable collaboration'
                        : 'Enable collaboration',
                    onSelect: () =>
                        void updateProperties({
                            collaborative: !playlist.collaborative,
                        }),
                },
                {
                    id: 'manage-playlist-collaborators',
                    label: 'Manage collaborators',
                    onSelect: () => setCollaboratorsOpen(true),
                },
                {
                    id: 'upload-playlist-cover',
                    label: playlist.images?.length
                        ? 'Change cover'
                        : 'Add cover',
                    onSelect: () => coverInputRef.current?.click(),
                }
            );
        }

        result.push({
            id: 'duplicate-playlist',
            label: 'Duplicate playlist',
            onSelect: () => void duplicate(),
        });

        if (isOwner) {
            result.push({
                id: 'remove-playlist',
                label: 'Remove from your playlists',
                onSelect: () => setRemovalOpen(true),
            });
        }

        if (canOpenDedupe) {
            result.push({
                id: 'find-playlist-duplicates',
                label: 'Find duplicates',
                onSelect: onOpenDedupe,
            });
        }

        return result;
    }, [
        canEdit,
        canOpenDedupe,
        data,
        duplicate,
        isOwner,
        onEdit,
        onOpenDedupe,
        updateProperties,
    ]);

    return {
        actions,
        coverInputRef,
        collaboratorsOpen,
        setCollaboratorsOpen,
        removalOpen,
        setRemovalOpen,
        removing,
        remove,
        uploadCover,
    };
}
